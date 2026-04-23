const fs = require("fs"); const path = "src/app/hocsinh/hs-khaosat/lam/[formId]/client.tsx"; let content = fs.readFileSync(path, "utf8"); content = content.replace(/const validate = \(qs: Q\[\]\) => \{[\s\S]*?return null\n  \}/, `const validate = (qs: Q[]) => {
    for (const q of qs) {
      if (q.isRequired) {
        const value = answers[q.id]
        if (value === undefined || value === "" || value === null) return q
        if (["MC_GRID", "CB_GRID", "GRID"].includes(q.questionType?.toUpperCase())) {
          let gridOpts = { rows: [] };
          try { 
            const p = JSON.parse(q.options || "{}");
            gridOpts = (p && typeof p === "object") ? p : { rows: [] };
          } catch {}
          const rows = gridOpts.rows || [];
          if (rows.length > 0) {
            const currentGrid = value || {};
            for (let ri = 0; ri < rows.length; ri++) {
              if (currentGrid[ri] === undefined || (Array.isArray(currentGrid[ri]) && currentGrid[ri].length === 0)) return q;
            }
          }
        }
      }
    }
    return null
  }`); fs.writeFileSync(path, content);
