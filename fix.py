import os
path = " src/app/admin/input-assessments/client.tsx\
with open(path, \r\, encoding=\utf-8\) as f:
 lines = f.readlines()
with open(path, \w\, encoding=\utf-8\) as f:
 for i, line in enumerate(lines):
 if 1456 <= i <= 1461:
 continue
 f.write(line)
