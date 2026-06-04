const fs = require('fs');
const path = require('path');

const adminPagePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\admin\\page.tsx';
let content = fs.readFileSync(adminPagePath, 'utf8');

const oldStr =     async function fetchMetrics() {
      try {
        const r = await fetch("/api/check-he-thong?action=getMetrics")
        if (r.ok) {
          setMetrics(await r.json())
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, []);

const newStr =     async function fetchMetrics() {
      try {
        setLoading(true)
        const yearId = localStorage.getItem("selectedAcademicYear") || ""
        const r = await fetch("/api/check-he-thong?action=getMetrics&academicYearId=" + yearId)
        if (r.ok) {
          setMetrics(await r.json())
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()

    window.addEventListener("academicYearChanged", fetchMetrics)
    return () => window.removeEventListener("academicYearChanged", fetchMetrics)
  }, []);

content = content.replace(oldStr, newStr);
fs.writeFileSync(adminPagePath, content, 'utf8');
console.log('Done');
