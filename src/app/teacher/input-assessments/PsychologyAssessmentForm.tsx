"use client"

import React, { useState, useEffect } from "react"
import { ClipboardCheck, Sparkles, Save, Info, BrainCircuit, User, MessageSquare, AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react"

interface Question {
    text: string
    options: string[]
}

interface Section {
    title: string
    questions: Question[]
}

interface QuestionsData {
    [key: string]: Section[]
}


const scaleOptions = ["0", "1", "2", "3", "4"]

const grades2to5Questions = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi bị điểm kém hoặc bị giáo viên nhắc nhở, con thường phản ứng như thế nào?", options: scaleOptions },
            { text: "2. Khi con và bạn có chuyện không vui (tranh giành đồ chơi, xích mích), con thường xử lý như thế nào?", options: scaleOptions },
            { text: "3. Khi bị từ chối hoặc không được chọn trong trò chơi, con cảm thấy thế nào?", options: scaleOptions },
            { text: "4. Trước giờ kiểm tra hoặc khi gặp một việc khó khăn, cảm xúc của con thường thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi & tự kiểm soát (3 mục)",
        questions: [
            { text: "5. Khi cô dặn phải ngồi yên hoặc chờ đến lượt, con làm thế nào?", options: scaleOptions },
            { text: "6. Trong lớp, khi nhiều điều khiển con chú ý, con thường phản ứng thế nào?", options: scaleOptions },
            { text: "7. Khi con cảm thấy bực hoặc tức giận, con thường làm gì để bình tĩnh lại?", options: scaleOptions }
        ]
    },
    {
        title: "III. Giao tiếp & tương tác xã hội (3 mục)",
        questions: [
            { text: "8. Khi gặp bạn mới, con làm gì để làm quen?", options: scaleOptions },
            { text: "9. Khi chơi cùng bạn, con thường chia sẻ hoặc hợp tác như thế nào?", options: scaleOptions },
            { text: "10. Khi con bị bạn trêu chọc hoặc bị hiểu lầm, con sẽ làm gì?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Chú ý & kỹ năng học tập nền (4 mục)",
        questions: [
            { text: "11. Khi cô hướng dẫn nhiều bước, con thường ghi nhớ và làm như thế nào?", options: scaleOptions },
            { text: "12. Khi nghe cô kể chuyện hoặc giảng bài, con nhớ lại điều gì sau đó?", options: scaleOptions },
            { text: "13. Khi làm bài tập, con bắt đầu và hoàn thành như thế nào?", options: scaleOptions },
            { text: "14. Khi trong lớp có tiếng ồn hoặc người khác làm việc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "V. Ngôn ngữ - tư duy - giải quyết vấn đề (3 mục)",
        questions: [
            { text: "15. Khi nhìn thấy các đồ vật học tập, con nghĩ mỗi món dùng để làm gì?", options: scaleOptions },
            { text: "16. Khi gặp tình huống thực tế (ví dụ: làm rơi đồ, bị bạn hiểu lầm), con thường làm gì?", options: scaleOptions },
            { text: "17. Khi xảy ra việc bất ngờ, con nghĩ ra cách giải quyết như thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực học tập & thái độ trường học (3 mục)",
        questions: [
            { text: "18. Khi đến trường, điều gì khiến con cảm thấy vui nhất?", options: scaleOptions },
            { text: "19. Khi cô giao bài, con thường bắt đầu như thế nào?", options: scaleOptions },
            { text: "20. Khi con gặp bài khó, con làm gì để vượt qua?", options: scaleOptions }
        ]
    }
]


const grade1Questions = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi thua trong trò chơi, con phản ứng thế nào?", options: scaleOptions },
            { text: "2. Khi rời cha mẹ vào lớp, con có dễ thích nghi không?", options: scaleOptions },
            { text: "3. Khi bị cô nhắc nhở, con phản ứng thế nào?", options: scaleOptions },
            { text: "4. Khi bạn trêu chọc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi & tự kiểm soát (3 mục)",
        questions: [
            { text: "5. Khi thầy/cô nói 'Ngồi yên nào', con có làm theo không?", options: scaleOptions },
            { text: "6. Con có hay chen ngang hoặc nói leo khi thầy/cô đang nói không?", options: scaleOptions },
            { text: "7. Con có thể ngồi tập trung làm một việc trong bao lâu?", options: scaleOptions }
        ]
    },
    {
        title: "III. Giao tiếp & tương tác xã hội (3 mục)",
        questions: [
            { text: "8. Khi gặp bạn mới, con có dễ bắt chuyện không?", options: scaleOptions },
            { text: "9. Con có biết chia sẻ đồ chơi, hợp tác trong trò chơi không?", options: scaleOptions },
            { text: "10. Khi bị bạn làm sai hoặc trêu chọc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Chú ý & kỹ năng học tập nền (4 mục)",
        questions: [
            { text: "11. Khi nghe hướng dẫn gồm 2 việc ('Lấy bút và ngồi xuống'), con làm được không?", options: scaleOptions },
            { text: "12. Khi nghe kể chuyện ngắn, con nhớ lại chi tiết được không?", options: scaleOptions },
            { text: "13. Khi làm bài, con có làm vội, chưa nghe xong đã làm không?", options: scaleOptions },
            { text: "14. Khi làm việc, con có bị sao nhãng bởi tiếng động hoặc bạn khác không?", options: scaleOptions }
        ]
    },
    {
        title: "V. Ngôn ngữ & tư duy (3 mục)",
        questions: [
            { text: "15. Khi được hỏi 'Cái nào dùng để viết: kéo hay bút?', con trả lời...", options: scaleOptions },
            { text: "16. Khi hỏi 'Con mèo khác con chó ở điểm nào?', con trả lời...", options: scaleOptions },
            { text: "17. Giáo viên đặt tình huống giả định, con có xử lý được không? (Ví dụ: Khi đi ra ngoài mà trời mưa/ nắng thì mình cần làm gì để khỏi bị nắng nóng/bị ướt? Khi bị bạn giật đồ chơi hoặc xô ngã thì con làm gì?).", options: scaleOptions }
        ]
    },
    {
        title: "VI. Thái độ & động lực học tập (3 mục)",
        questions: [
            { text: "18. Con có thích đến trường không?", options: scaleOptions },
            { text: "19. Khi thầy/cô giao bài, con phản ứng thế nào?", options: scaleOptions },
            { text: "20. Khi gặp bài khó, con xử lý thế nào?", options: scaleOptions }
        ]
    }
]


const grades6to9Questions = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi gặp áp lực học tập (thi, kiểm tra), em cảm thấy thế nào?", options: scaleOptions },
            { text: "2. Khi bị cô/thầy phê bình trước lớp, em phản ứng ra sao?", options: scaleOptions },
            { text: "3. Gần đây, có khi nào em cảm thấy buồn chán hoặc không muốn làm gì mà không rõ lý do không? Hãy kể cô/thầy nghe.", options: scaleOptions },
            { text: "4. Khi em tức giận hoặc thất vọng, em thường làm gì để bình tĩnh lại?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi – kiểm soát bản thân (3 mục)",
        questions: [
            { text: "5. Khi không có cô/thầy trong lớp, em thường cư xử như thế nào với các bạn?", options: scaleOptions },
            { text: "6. Khi có xung đột hay bất đồng với người khác, em thường làm gì đầu tiên?", options: scaleOptions },
            { text: "7. Khi có bài tập hoặc việc được giao mà em không thích, em thường phản ứng như thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "III. Quan hệ xã hội & tương tác nhóm (3 mục)",
        questions: [
            { text: "8. Trong lớp, em cảm thấy các bạn đối xử với nhau như thế nào? Mọi người có thân thiện không?", options: scaleOptions },
            { text: "9. Khi em và bạn có hiểu lầm, em thường làm gì để giải quyết vấn đề đó?", options: scaleOptions },
            { text: "10. Gần đây em có cảm thấy căng thẳng, bực mình hoặc hay xung đột với bạn bè, thầy cô hay cha mẹ không? Em thường phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Học tập & chú ý (4 mục)",
        questions: [
            { text: "11. Khi học bài hoặc nghe giảng, em có dễ tập trung không? Điều gì khiến em dễ mất tập trung?", options: scaleOptions },
            { text: "12. Khi gặp một bài tập khó, em thường làm gì? Em mặc kệ hay tự tìm hiểu, nhờ sự giúp đỡ của người khác?", options: scaleOptions },
            { text: "13. Em có thường xuyên hoàn thành bài tập đúng thời hạn không? Nguyên nhân nào khiến em không nộp bài đúng thời hạn?", options: scaleOptions },
            { text: "14. Trong giờ học, có khi nào em thấy mình hay mơ màng hoặc làm việc riêng không? Khi đó, em nghĩ gì?", options: scaleOptions }
        ]
    },
    {
        title: "V. Tự nhận thức & hình ảnh bản thân (3 mục)",
        questions: [
            { text: "15. Em cảm thấy thế nào về bản thân mình trong học tập cũng như trong cuộc sống hằng ngày?", options: scaleOptions },
            { text: "16. Khi nhìn thấy bạn học giỏi hơn, đẹp hơn hoặc chơi thể thao giỏi hơn, em thường nghĩ gì về bản thân?", options: scaleOptions },
            { text: "17. Khi mắc lỗi, em có dám nhận và sửa lỗi, hay thường che giấu hoặc né tránh?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực & định hướng học tập (3 mục)",
        questions: [
            { text: "18. Em có đặt ra mục tiêu cho việc học hoặc tương lai của mình không? Mục tiêu đó là gì?", options: scaleOptions },
            { text: "19. Khi gặp khó khăn trong học tập, em thường làm gì? Có cố gắng tiếp tục hay dễ bỏ cuộc?", options: scaleOptions },
            { text: "20. Mỗi sáng đến trường, em cảm thấy thế nào? Có điều gì khiến em vui hay không thích đến lớp?", options: scaleOptions }
        ]
    }
]


const grades10to12Questions = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi đối diện với kỳ thi hoặc áp lực học tập, em cảm thấy thế nào?", options: scaleOptions },
            { text: "2. Khi gặp thất bại (thi điểm thấp, không đạt kỳ vọng), em phản ứng thế nào?", options: scaleOptions },
            { text: "3. Có khi nào em cảm thấy buồn, trống rỗng hoặc không còn hứng thú với mọi thứ xung quanh không? Khi đó, em thường làm gì?", options: scaleOptions },
            { text: "4. Khi em tức giận hoặc căng thẳng, em thường làm gì để giúp mình bình tĩnh trở lại?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi – kiểm soát bản thân (3 mục)",
        questions: [
            { text: "5. Em thường duy trì thói quen học tập và sinh hoạt hằng ngày như thế nào? Có điều gì khiến em dễ bị xáo trộn không?", options: scaleOptions },
            { text: "6. Khi cảm thấy bực tức hoặc bị hiểu lầm, em thường phản ứng ra sao? Có khi nào em nổi nóng, cãi lại hoặc bỏ đi không?", options: scaleOptions },
            { text: "7. Khi em mắc lỗi, em thường làm gì? Em có dám nhận trách nhiệm và tìm cách sửa lỗi không?", options: scaleOptions }
        ]
    },
    {
        title: "III. Quan hệ xã hội & tương tác nhóm (3 mục)",
        questions: [
            { text: "8. Trong lớp và ở nhà, em cảm thấy mọi người – bạn bè, thầy cô, cha mẹ – có lắng nghe và tôn trọng ý kiến của em không?", options: scaleOptions },
            { text: "9. Khi có mâu thuẫn hoặc bất đồng, em thường chọn cách nào để giải quyết? (Nói chuyện, im lặng, tránh né, hay phản ứng mạnh?)", options: scaleOptions },
            { text: "10. Có khi nào em cảm thấy bị hiểu lầm, bị cô lập hoặc không thuộc về nhóm nào ở trường không? Em làm gì trong những tình huống đó?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Học tập & khả năng tự định hướng (4 mục)",
        questions: [
            { text: "11. Em có xác định được mục tiêu học tập hoặc hướng phát triển cho bản thân trong giai đoạn này không? Mục tiêu và hướng phát triển đó là gì?", options: scaleOptions },
            { text: "12. Khi cảm thấy mệt mỏi hoặc chán học, em thường làm gì để lấy lại động lực?", options: scaleOptions },
            { text: "13. Khi gặp bài khó hoặc vấn đề trong học tập, em thường giải quyết bằng cách nào? (Tự tìm hiểu, hỏi người khác hay bỏ qua?)", options: scaleOptions },
            { text: "14. Một ngày của em thường được sắp xếp ra sao giữa học, nghỉ ngơi và giải trí? Em có cảm thấy cân bằng không?", options: scaleOptions }
        ]
    },
    {
        title: "V. Tự nhận thức & hình ảnh bản thân (3 mục)",
        questions: [
            { text: "15. Em cảm thấy thế nào về bản thân mình – về năng lực, tính cách, và ngoại hình?", options: scaleOptions },
            { text: "16. Khi nhìn thấy người khác giỏi hơn, thành công hơn, em thường nghĩ gì về bản thân mình?", options: scaleOptions },
            { text: "17. Em có hiểu rõ điểm mạnh và điểm yếu của mình không? Em thường làm gì để cải thiện hoặc phát huy chúng?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực & định hướng tương lai (3 mục)",
        questions: [
            { text: "18. Em có định hướng rõ ràng cho bản thân sau khi tốt nghiệp THPT không? Em muốn làm gì hoặc học ngành gì?", options: scaleOptions },
            { text: "19. Theo em, việc học hiện tại có ý nghĩa như thế nào đối với mục tiêu tương lai của em?", options: scaleOptions },
            { text: "20. Khi gặp khó khăn trong cuộc sống hoặc học tập, điều gì giúp em có động lực để tiếp tục cố gắng?", options: scaleOptions }
        ]
    }
]

const questionsData: QuestionsData = {
    "1": grade1Questions,

    "10": grades10to12Questions,
    "11": grades10to12Questions,
    "12": grades10to12Questions,

    "6": grades6to9Questions,
    "7": grades6to9Questions,
    "8": grades6to9Questions,
    "9": grades6to9Questions,

    "2": grades2to5Questions,
    "3": grades2to5Questions,
    "4": grades2to5Questions,
    "5": grades2to5Questions
}

const defaultQuestions = [
    {
        title: "TỔNG QUAN TÂM LÝ & HÀNH VI (Dành cho mọi khối lớp)",
        questions: [
            { text: "Tinh thần thái độ khi bắt đầu khảo sát.", options: ["Rụt rè", "Bình thường", "Rất hào hứng"] },
            { text: "Mức độ tập trung trong suốt quá trình.", options: ["Dễ sao nhãng", "Tập trung trung bình", "Rất tập trung"] },
            { text: "Khả năng tương tác với giáo viên khảo sát.", options: ["Hạn chế", "Tạm được", "Linh hoạt, cởi mở"] },
            { text: "Sự tự lập khi thực hiện nhiệm vụ.", options: ["Cần nhắc nhở nhiều", "Cần nhắc nhở ít", "Hoàn toàn tự lập"] },
            { text: "Khả năng kiểm soát cảm xúc khi gặp thử thách.", options: ["Dễ nản chí", "Cần động viên", "Kiên trì nỗ lực"] }
        ]
    }
]

export default function PsychologyAssessmentForm({ student, onSave, isLocked }: any) {
    
    const rawGrade = String(student?.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim()
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default"

    const sections = questionsData[currentGrade] || defaultQuestions
    const isGrades1to5 = ["1", "2", "3", "4", "5"].includes(currentGrade)
    const isGrades6to12 = ["6", "7", "8", "9", "10", "11", "12"].includes(currentGrade)
    const isScoredForm = isGrades1to5 || isGrades6to12
    const [scores, setScores] = useState<number[]>(Array(20).fill(-1))
    const [notes, setNotes] = useState<string[]>(Array(20).fill(""))
    const [conclusion, setConclusion] = useState("")
    const [recommendation, setRecommendation] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [activeSection, setActiveSection] = useState(0)

    // Lược sử đánh giá
    const [historyList, setHistoryList] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

    useEffect(() => {
        if (!student?.studentCode) return
        setLoadingHistory(true)
        fetch(`/api/teacher-assessments?action=getRetestHistory&studentCode=${encodeURIComponent(student.studentCode)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHistoryList(data)
                }
                setLoadingHistory(false)
            })
            .catch(err => {
                console.error("Error fetching student history:", err)
                setLoadingHistory(false)
            })
    }, [student])

    useEffect(() => {
        const scoreData = student?.scores?.find((sc: any) => sc.subject?.code === 'TLY') || student?.scores?.[0]
        if (scoreData) {
            try {
                const parsedScores = JSON.parse(scoreData.scores || "[]")
                // In the new system, we store 7 results (6 sections + total) at index 0-6
                // and 20 raw items at index 7-26
                if (parsedScores.length >= 27) {
                    setScores(parsedScores.slice(7, 27).map(Number))
                } else if (parsedScores.length === 20) {
                    // Legacy support
                    setScores(parsedScores.map(Number))
                }
                
                const parsedComments = JSON.parse(scoreData.comments || "[]")
                if (parsedComments.length >= 2) {
                    
                    setConclusion(parsedComments[0] || "")
                    setRecommendation(parsedComments[1] || "")
                
                    if (parsedComments.length >= 22) {
                        setNotes(parsedComments.slice(2, 22))
                    }
                }
            } catch (e) {
                console.error("Error parsing psychology scores", e)
            }
        }
    }, [student])

    const calculateSectionScore = (sectionIdx: number) => {
        let questionOffset = 0
        for (let i = 0; i < sectionIdx; i++) {
            questionOffset += sections[i].questions.length
        }
        const sectionQuestions = sections[sectionIdx].questions
        const sectionTotal = scores.slice(questionOffset, questionOffset + sectionQuestions.length).reduce((a, b) => a + b, 0)
        return sectionTotal
    }

    const totalScore = scores.reduce((a, b) => a + b, 0)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Reorder for Admin Report: 
            // 0-5: Sections, 6: TOTAL, 7-26: Raw Questions
            const sectionScores = sections.map((_, i) => calculateSectionScore(i))
            const finalScores = [...sectionScores, totalScore, ...scores]
            
            // Map comments to the expected array structure: [Conclusion, Recommendation]
            const finalComments = [conclusion, recommendation, ...notes]
            
            await onSave(student, finalScores, finalComments)
            alert("Lưu kết quả Tâm lý thành công!")
        } catch (e) {
            alert("Lỗi khi lưu kết quả.")
        } finally {
            setIsSaving(false)
        }
    }

    const currentQuestions = sections[activeSection].questions
    let currentOffset = 0
    for (let i = 0; i < activeSection; i++) {
        currentOffset += sections[i].questions.length
    }

    const progress = Math.round((scores.filter(s => s >= 0).length / 20) * 100)

    const getEvaluation = (score: number) => {
        if (isGrades6to12) {
            if (score <= 15) return { level: "Bình thường", suggestion: "Ổn định, thích nghi tốt", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
            if (score <= 31) return { level: "Dấu hiệu nhẹ", suggestion: "Theo dõi - hỗ trợ tâm lý học đường", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
            if (score <= 47) return { level: "Dấu hiệu vừa", suggestion: "Quan sát sâu, tư vấn cá nhân", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
            if (score <= 63) return { level: "Nguy cơ cao", suggestion: "Đánh giá chuyên sâu, can thiệp định kỳ", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
            return { level: "Nguy cơ rất cao", suggestion: "Cần can thiệp chuyên môn, phối hợp phụ huynh", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
        }
        
        // Grades 1-5 default
        if (score <= 15) return { level: "Bình thường", suggestion: "Có thể theo học bình thường", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
        if (score <= 31) return { level: "Dấu hiệu nhẹ", suggestion: "Theo dõi - hỗ trợ thích nghi", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
        if (score <= 47) return { level: "Dấu hiệu vừa", suggestion: "Quan sát sâu, can thiệp nhẹ nếu cần", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
        if (score <= 63) return { level: "Nguy cơ cao", suggestion: "Cần đánh giá chuyên sâu và can thiệp", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
        return { level: "Nguy cơ rất cao", suggestion: "Cần can thiệp chuyên môn sớm (bảo đảm an toàn và hỗ trợ)", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    };

    const evaluation = isScoredForm ? getEvaluation(totalScore) : null;

    return (
        <div className="bg-slate-50 min-h-screen p-3 md:p-6 font-sans text-slate-900 border-x">
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Header Profile Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-violet-100 flex flex-col md:flex-row gap-5 items-center relative overflow-hidden">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                        <User size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex justify-center md:justify-start gap-2 items-center mb-1">
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold border border-indigo-200">Khối {rawGrade || "N/A"}</span>
                            <span className="text-slate-500 text-xs font-medium">ID: {student?.studentCode}</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">{student?.fullName}</h1>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full"><Sparkles size={12} className="text-amber-500"/> Phiếu đánh giá Tâm lý</span>
                    </div>
                                        <div className="flex flex-col items-center md:items-end gap-1 mt-2 md:mt-0">
                        <div className="text-3xl font-black text-indigo-600 flex items-baseline gap-1">
                            {totalScore} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Điểm</span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tiến độ: {progress}%</div>
                    </div>
                </div>

                {/* Render Lược sử điểm đánh giá */}
                {(() => {
                    const pastAssessments = historyList.filter((h: any) => h.id !== student.id);
                    if (pastAssessments.length === 0) return null;
                    return (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-100 space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b">
                                <ClipboardCheck size={18} className="text-indigo-600" />
                                <h3 className="font-bold text-slate-800 text-sm">Lược sử điểm đánh giá các đợt trước</h3>
                                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{pastAssessments.length} đợt</span>
                            </div>
                            {loadingHistory ? (
                                <div className="text-xs text-slate-500 py-2">Đang tải lược sử...</div>
                            ) : (
                                <div className="space-y-3">
                                    {pastAssessments.map((histRec: any) => {
                                        const scoreData = histRec.scores?.find((sc: any) => sc.subject?.code === 'TLY' || sc.subject?.code?.toLowerCase() === 'tly');
                                        const scoreVal = (() => {
                                            if (histRec.psychologyScore !== null && histRec.psychologyScore !== undefined) {
                                                return histRec.psychologyScore;
                                            }
                                            if (!scoreData) return null;
                                            try {
                                                const parsed = JSON.parse(scoreData.scores || "[]");
                                                if (parsed.length >= 7) return Number(parsed[6]);
                                                if (parsed.length > 0) return parsed.reduce((sum, val) => sum + (Number(val) || 0), 0);
                                            } catch (e) {}
                                            return null;
                                        })();

                                        const comments = (() => {
                                            if (!scoreData) return [];
                                            try {
                                                return JSON.parse(scoreData.comments || "[]");
                                            } catch (e) { return []; }
                                        })();

                                        const concl = comments[0] || "—";
                                        const recom = comments[1] || "—";

                                        if (scoreVal === null) return null;

                                        const isExpanded = expandedHistoryId === histRec.id;
                                        const evalInfo = getEvaluation(scoreVal);

                                        return (
                                            <div key={histRec.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md bg-slate-50/50">
                                                <div 
                                                    onClick={() => setExpandedHistoryId(isExpanded ? null : histRec.id)}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-3 bg-white"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0"></div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{histRec.period?.name || "Kỳ khảo sát"}</h4>
                                                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                                                                Đợt: <span className="font-semibold">{histRec.batch?.name || "Khảo sát lẻ"}</span> | 
                                                                Ngày đánh giá: <span className="font-semibold">{histRec.createdAt ? new Date(histRec.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <span className="text-lg font-black text-indigo-600">{scoreVal}</span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase block -mt-1">Điểm</span>
                                                        </div>
                                                        {evalInfo && (
                                                            <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wide shadow-sm ${evalInfo.bg} ${evalInfo.border} ${evalInfo.color}`}>
                                                                {evalInfo.level}
                                                            </div>
                                                        )}
                                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                            <div className="bg-white p-3 rounded-lg border border-amber-100">
                                                                <h5 className="font-bold text-amber-800 mb-1">Kết luận sơ bộ:</h5>
                                                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{concl}</p>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                                                <h5 className="font-bold text-emerald-800 mb-1">Khuyến nghị dành cho phụ huynh:</h5>
                                                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{recom}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                
                {isScoredForm && (
                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 shadow-sm text-sm">
                        <h3 className="font-bold text-indigo-800 mb-2">5. Thang điểm chung cho mỗi câu hỏi:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">0</span> <span className="text-slate-700">Không bao giờ / Không có biểu hiện</span></div>
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">1</span> <span className="text-slate-700">Hiếm khi / Biểu hiện rất nhẹ</span></div>
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">2</span> <span className="text-slate-700">Thỉnh thoảng / Biểu hiện nhẹ</span></div>
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">3</span> <span className="text-slate-700">Thường xuyên / Biểu hiện rõ</span></div>
                            <div className="flex gap-2 md:col-span-2"><span className="font-bold text-indigo-600 w-4">4</span> <span className="text-slate-700">Rất thường xuyên / Ảnh hưởng rõ đến sinh hoạt hoặc học tập</span></div>
                        </div>
                        <h2 className="font-black text-indigo-900 text-lg uppercase">B. THANG ĐO SÀNG LỌC TÂM LÝ:</h2>
                    </div>
                )}

                {/* Section Navigation */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-rose-100 p-2 overflow-x-auto custom-scrollbar flex gap-2">
                    {sections.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSection(idx)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${
                                activeSection === idx
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSection === idx ? "bg-indigo-500" : "bg-slate-300"}`}></span>
                                {section.title}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Question List (Compact Layout) */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-teal-100 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <ChevronRight size={16} className="text-indigo-500" />
                            {sections[activeSection].title}
                        </h2>
                        <div className="bg-indigo-100 px-3 py-1 rounded-md text-[11px] font-bold text-indigo-700">
                            Điểm phần này: {calculateSectionScore(activeSection)}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {currentQuestions.map((q, qIdx) => {
                            const actualIdx = currentOffset + qIdx
                            return (
                                <div key={qIdx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-center p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                    <div className="lg:col-span-5 xl:col-span-6 flex items-start gap-3">
                                        <span className="text-slate-400 font-bold text-sm w-5 shrink-0 mt-0.5">{actualIdx + 1}.</span>
                                        <span className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">{q.text.replace(/^\d+\.\s*/, "")}</span>
                                    </div>
                                    <div className={`lg:col-span-7 xl:col-span-6 flex ${isScoredForm ? "gap-6 justify-start mt-2 lg:mt-0" : "gap-2"} w-full ml-8 lg:ml-0`}>
                                        {q.options.map((opt, oIdx) => {
                                            const optValue = q.options.length === 5 ? oIdx : oIdx + 1;
                                            return isScoredForm ? (
                                                <label key={oIdx} className="flex items-center gap-1.5 cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        disabled={isLocked}
                                                        name={`question-${actualIdx}`}
                                                        checked={scores[actualIdx] === optValue}
                                                        onChange={() => {
                                                            const newScores = [...scores];
                                                            newScores[actualIdx] = optValue;
                                                            setScores(newScores);
                                                        }}
                                                        className="w-4 h-4 border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                                    />
                                                    <span className={`font-bold ${scores[actualIdx] === optValue ? "text-indigo-700" : "text-slate-600 group-hover:text-indigo-600"}`}>{opt}</span>
                                                </label>
                                            ) : (
                                            <button
                                                key={oIdx}
                                                disabled={isLocked}
                                                onClick={() => {
                                                    const newScores = [...scores]
                                                    newScores[actualIdx] = optValue
                                                    setScores(newScores)
                                                }}
                                                className={`flex-1 py-2.5 px-2 text-[11px] md:text-xs font-bold rounded-lg border transition-all ${
                                                    scores[actualIdx] === optValue
                                                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30"
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        )})}
                                    </div>
                                    {isScoredForm && (
                                        <div className="lg:col-span-12 w-full mt-1.5 ml-8 lg:ml-0 flex items-end gap-2">
                                            <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap mb-0.5">Ghi chú quan sát:</span>
                                            <input
                                                type="text"
                                                value={notes[actualIdx] || ""}
                                                onChange={(e) => {
                                                    const newNotes = [...notes]
                                                    newNotes[actualIdx] = e.target.value
                                                    setNotes(newNotes)
                                                }}
                                                disabled={isLocked}
                                                className="flex-1 text-[13px] border-b border-slate-300 border-dashed bg-transparent outline-none focus:border-indigo-500 transition-all text-slate-800 px-1 py-0.5"
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {isScoredForm && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-100">
                        <h3 className="font-bold text-slate-800 text-base mb-4">TỔNG HỢP:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-8 mb-4 text-sm font-medium text-slate-700">
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục I :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(0)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục III :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(2)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục V :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(4)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục II :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(1)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục IV :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(3)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục VI :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(5)}</span></div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 mt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-slate-800 text-sm">Tổng điểm:</span>
                                <span className="font-black text-indigo-600 border-b border-slate-400 min-w-[60px] inline-block text-center text-lg">{totalScore}</span>
                            </div>
                            
                            {progress === 100 && evaluation && (
                                <div className={`flex-1 p-3 rounded-xl border ${evaluation.bg} ${evaluation.border}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mức độ:</span>
                                        <span className={`font-black ${evaluation.color} uppercase`}>{evaluation.level}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Gợi ý đánh giá:</span>
                                        <span className={`text-sm font-semibold ${evaluation.color}`}>{evaluation.suggestion}</span>
                                    </div>
                                </div>
                            )}
                            {progress < 100 && (
                                <div className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 text-center sm:text-left">
                                    <span className="text-xs font-medium text-slate-500 italic">Vui lòng đánh giá đủ 20 câu hỏi để xem kết quả phân tích mức độ tự động.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Conclusion and Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-amber-100 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-amber-500" />
                            <h3 className="font-bold text-slate-800 text-sm">{isScoredForm ? "C. KẾT LUẬN SƠ BỘ:" : "Kết luận chuyên môn"}</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={conclusion}
                            onChange={(e) => setConclusion(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none transition-all text-sm text-slate-700 resize-y"
                            placeholder="Nhận định tổng quát..."
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-100 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={18} className="text-emerald-500" />
                            <h3 className="font-bold text-slate-800 text-sm">{isScoredForm ? "D. KHUYẾN NGHỊ DÀNH CHO PHỤ HUYNH (NẾU CÓ):" : "Kiến nghị hỗ trợ"}</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 outline-none transition-all text-sm text-slate-700 resize-y"
                            placeholder="Gợi ý can thiệp, hỗ trợ..."
                        ></textarea>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <AlertCircle size={14} className="text-indigo-500" />
                        Lưu ý kiểm tra kỹ trước khi Xác nhận
                    </div>
                    
                    {progress === 100 && !isLocked && (
                        <div className="hidden md:flex text-emerald-600 text-xs font-bold items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 size={14} /> Hoàn tất đánh giá
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLocked}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={16} />
                        )}
                        {isLocked ? "Form đã khóa" : "Lưu Kết Quả"}
                    </button>
                </div>
            </div>
        </div>
    )
}
