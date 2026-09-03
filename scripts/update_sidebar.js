const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const sidebarPath = path.join(rootDir, 'src', 'components', 'Sidebar.tsx');
let content = fs.readFileSync(sidebarPath, 'utf8');

// 1. Add Globe to imports
if (!content.includes('Globe')) {
  content = content.replace('Baby', 'Baby,\n  Globe');
}

// 2. Add Admin menu item
const adminAnchor = '{/* 2. Dự giờ đánh giá Mầm non */}';
const adminItem = `{/* 3. Dự giờ GVNN (ESL) */}
              <Link 
                href="/admin/du-gio-gvnn" 
                onClick={() => setIsOpen(false)} 
                className={\`group relative flex items-center \${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 \${
                  pathname.startsWith("/admin/du-gio-gvnn")
                    ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10" 
                    : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                }\`}
              >
                <div className={\`w-7 h-7 rounded-lg flex items-center justify-center transition-all \${isCollapsed ? 'mx-auto' : 'mr-2.5'} \${
                  pathname.startsWith("/admin/du-gio-gvnn")
                    ? "bg-sky-500/20 border border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.25)]"
                    : "bg-white/5 border border-white/10 group-hover:border-sky-500/30"
                }\`}>
                  <Globe className={\`w-4 h-4 transition-all \${
                    pathname.startsWith("/admin/du-gio-gvnn") ? "text-sky-400" : "text-slate-400 group-hover:text-sky-400 group-hover:scale-110"
                  }\`} />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">3. Dự giờ GVNN (ESL)</span>}
              </Link>

              `;

if (!content.includes('/admin/du-gio-gvnn') && content.includes(adminAnchor)) {
  content = content.replace(adminAnchor, adminItem + adminAnchor);
}

// 3. Add Teacher menu item
const teacherAnchor = '{/* 2. Dự giờ đánh giá Mầm non */}';
const teacherItem = `{/* 3. Dự giờ GVNN (ESL) */}
                <Link 
                  href="/teacher/du-gio-gvnn" 
                  onClick={() => setIsOpen(false)} 
                  className={\`group relative flex items-center \${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-xl transition-all duration-300 text-xs font-bold mb-1.5 \${
                    pathname.startsWith('/teacher/du-gio-gvnn')
                      ? "bg-gradient-to-r from-white/15 to-white/5 border border-white/10 text-white shadow-md shadow-black/10"
                      : "text-white/70 hover:text-white hover:bg-white/5 hover:translate-x-1"
                  }\`}
                >
                  <div className={\`w-7 h-7 rounded-lg flex items-center justify-center transition-all \${isCollapsed ? 'mx-auto' : 'mr-2.5'} \${
                    pathname.startsWith('/teacher/du-gio-gvnn')
                      ? "bg-sky-500/20 border border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.25)]"
                      : "bg-white/5 border border-white/10 group-hover:border-sky-500/30"
                  }\`}>
                    <Globe className={\`w-4 h-4 transition-all \${
                      pathname.startsWith('/teacher/du-gio-gvnn') ? "text-sky-400" : "text-slate-400 group-hover:text-sky-400 group-hover:scale-110"
                    }\`} />
                  </div>
                  {!isCollapsed && <span>3. Dự giờ GVNN (ESL)</span>}
                </Link>

                `;

// Replace in teacher block
const teacherK12Anchor = '{/* 2. Dự giờ Giáo viên (K-12) */}';
if (!content.includes('/teacher/du-gio-gvnn') && content.includes(teacherK12Anchor)) {
  content = content.replace(teacherK12Anchor, teacherItem + teacherK12Anchor);
}

fs.writeFileSync(sidebarPath, content, 'utf8');
console.log('Sidebar.tsx successfully updated with ESL observation links');
