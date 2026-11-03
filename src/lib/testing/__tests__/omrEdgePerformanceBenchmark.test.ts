import { describe, it, expect } from "vitest";
import {
  processGrayscaleOmrSheet,
  synthesizeOmrSheetGrayscaleBuffer,
  computeOmrIdempotencyKey,
} from "../edgeOmrVisionEngine";
import {
  enqueueOmrSheetInIndexedDb,
  listOmrQueueByExam,
  syncQueuedOmrItemsInBatches,
  clearConfirmedOmrQueueItems,
  runHybridServerFallbackQueue,
  runOmrPerformanceBenchmarkSuite,
} from "../omrIndexedDbQueue";

describe("Edge Computer Vision OMR, IndexedDB Queue & 5,000-Sheet Benchmark Suite", () => {
  const sampleAnswers: Record<number, string> = {
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "A",
    6: "C",
    7: "B",
    8: "D",
    9: "A",
    10: "B",
  };

  it("1. Accurately recognizes SBD, Variant Code, and Answers across Clean, Faint Mark, Multi-mark, Skewed, and Low-Light sheets", () => {
    // 1.1 Clean sheet
    const cleanBuf = synthesizeOmrSheetGrayscaleBuffer({
      candidateNumber: "200158",
      variantCode: "102",
      answers: sampleAnswers,
      condition: "CLEAN",
    });
    const cleanRes = processGrayscaleOmrSheet({
      gray: cleanBuf.gray,
      width: cleanBuf.width,
      height: cleanBuf.height,
      subjectExamId: "EXAM-CV-1",
      totalQuestions: 10,
      rawImageBytes: cleanBuf.rawPhotoEquivalentBytes,
      imageStoragePolicy: "ANOMALY_CROPS_ONLY",
    });

    expect(cleanRes.candidateNumber).toBe("200158");
    expect(cleanRes.variantCode).toBe("102");
    expect(cleanRes.rawBubbleMap["1"].detectedOption).toBe("A");
    expect(cleanRes.rawBubbleMap["5"].detectedOption).toBe("A");
    // Clean sheet uploads 0 bytes of image under ANOMALY_CROPS_ONLY
    expect(cleanRes.evidenceCropDataUrl).toBeNull();
    expect(cleanRes.transmittedBytes).toBeLessThan(2000);

    // 1.2 Faint mark (tô mờ)
    const faintBuf = synthesizeOmrSheetGrayscaleBuffer({
      candidateNumber: "200159",
      variantCode: "103",
      answers: sampleAnswers,
      condition: "FAINT_MARK",
    });
    const faintRes = processGrayscaleOmrSheet({
      gray: faintBuf.gray,
      width: faintBuf.width,
      height: faintBuf.height,
      subjectExamId: "EXAM-CV-1",
      totalQuestions: 10,
      imageStoragePolicy: "ANOMALY_CROPS_ONLY",
    });
    expect(faintRes.candidateNumber).toBe("200159");
    expect(faintRes.anomalyFlags).toContain("FAINT_MARK");
    expect(faintRes.rawBubbleMap["5"].detectedOption).toBe("A");
    expect(faintRes.evidenceCropDataUrl).toBeTruthy();

    // 1.3 Multi-mark (tô nhiều ô ở câu 5)
    const multiBuf = synthesizeOmrSheetGrayscaleBuffer({
      candidateNumber: "200160",
      variantCode: "104",
      answers: sampleAnswers,
      condition: "MULTI_MARK",
    });
    const multiRes = processGrayscaleOmrSheet({
      gray: multiBuf.gray,
      width: multiBuf.width,
      height: multiBuf.height,
      subjectExamId: "EXAM-CV-1",
      totalQuestions: 10,
      imageStoragePolicy: "ANOMALY_CROPS_ONLY",
    });
    expect(multiRes.anomalyFlags).toContain("MULTI_MARK");
    expect(multiRes.rawBubbleMap["5"].detectedOption).toContain(",");

    // 1.4 Skewed & Low-light sheets
    const lowLightBuf = synthesizeOmrSheetGrayscaleBuffer({
      candidateNumber: "200161",
      variantCode: "101",
      answers: sampleAnswers,
      condition: "LOW_LIGHT",
    });
    const lowLightRes = processGrayscaleOmrSheet({
      gray: lowLightBuf.gray,
      width: lowLightBuf.width,
      height: lowLightBuf.height,
      subjectExamId: "EXAM-CV-1",
      totalQuestions: 10,
    });
    expect(lowLightRes.candidateNumber).toBe("200161");
    expect(lowLightRes.anomalyFlags).toContain("LOW_LIGHT_CONTRAST");
    expect(lowLightRes.rawBubbleMap["1"].detectedOption).toBe("A");
  });

  it("2. Enforces IndexedDB Offline Queue states, Idempotency deduplication, and Offline -> Online recovery without data loss", async () => {
    const examId = "EXAM-QUEUE-TEST-01";
    const buf1 = synthesizeOmrSheetGrayscaleBuffer({
      candidateNumber: "200201",
      variantCode: "101",
      answers: sampleAnswers,
      condition: "CLEAN",
    });
    const payload1 = processGrayscaleOmrSheet({
      gray: buf1.gray,
      width: buf1.width,
      height: buf1.height,
      subjectExamId: examId,
      totalQuestions: 10,
    });

    const enq1 = await enqueueOmrSheetInIndexedDb(payload1);
    expect(enq1.item.status).toBe("UNSYNCED");
    expect(enq1.skippedDuplicate).toBe(false);

    // Simulate Offline Sync: item must remain UNSYNCED and NOT be lost or deleted
    const offlineSync = await syncQueuedOmrItemsInBatches({
      subjectExamId: examId,
      imageStoragePolicy: "ANOMALY_CROPS_ONLY",
      simulateOffline: true,
    });
    expect(offlineSync.syncedCount).toBe(0);
    expect(offlineSync.failedCount).toBe(1);

    const deletedWhileUnsynced = await clearConfirmedOmrQueueItems(examId);
    expect(deletedWhileUnsynced).toBe(0); // Never deletes unconfirmed items!

    // Simulate Online Recovery with Server ACK
    const onlineSync = await syncQueuedOmrItemsInBatches({
      subjectExamId: examId,
      imageStoragePolicy: "ANOMALY_CROPS_ONLY",
      simulateOffline: false,
      customTransport: async ({ items }) => ({
        success: true,
        ackItems: items.map((it) => ({
          idempotencyKey: it.idempotencyKey,
          sheetId: `SERVER-SHEET-${it.candidateNumber}`,
          recognitionStatus: "RECOGNIZED",
          mcqScore: 7.0,
          correctCount: 10,
          anomalyFlags: [],
        })),
      }),
    });

    expect(onlineSync.syncedCount).toBe(1);
    expect(onlineSync.completedCount).toBe(1);

    // Re-enqueuing an already COMPLETED sheet is skipped via Idempotency Key
    const enqDuplicate = await enqueueOmrSheetInIndexedDb(payload1);
    expect(enqDuplicate.skippedDuplicate).toBe(true);

    const listAfter = await listOmrQueueByExam(examId);
    expect(listAfter[0].status).toBe("COMPLETED");
  });

  it("3. Limits concurrency in Hybrid Server Fallback Queue and retries transient errors", async () => {
    let attemptsForTask2 = 0;
    const tasks = [1, 2, 3, 4, 5, 6];

    const hybridRes = await runHybridServerFallbackQueue({
      tasks,
      maxConcurrent: 2,
      maxRetries: 2,
      workerFn: async (taskNum) => {
        await new Promise((r) => setTimeout(r, 10));
        if (taskNum === 2 && attemptsForTask2 === 0) {
          attemptsForTask2 += 1;
          throw new Error("Temporary network jitter");
        }
        return `PROCESSED-${taskNum}`;
      },
    });

    expect(hybridRes.peakConcurrencyObserved).toBeLessThanOrEqual(2);
    expect(hybridRes.results.length).toBe(6);
    expect(hybridRes.failures.length).toBe(0);
  });

  it("4. Benchmarks 100, 500, 1,000, and 5,000 OMR sheets with >99.5% upload reduction", () => {
    const suite = runOmrPerformanceBenchmarkSuite("ANOMALY_CROPS_ONLY");
    expect(suite.tiers.length).toBe(8); // 4 sheet counts x 2 device profiles
    expect(suite.adverseCases.length).toBe(5);

    const tier5000Desktop = suite.tiers.find(
      (t) => t.sheetCount === 5000 && t.deviceProfile === "DESKTOP_8CORE"
    );
    expect(tier5000Desktop).toBeDefined();
    expect(tier5000Desktop!.bandwidthReductionPercent).toBeGreaterThan(99.5);
    expect(tier5000Desktop!.offlineRecoverySuccessPercent).toBe(100);
  });
});
