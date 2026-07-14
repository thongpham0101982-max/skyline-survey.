$c = [IO.File]::ReadAllText('prisma\schema.prisma')
$bad = 'studyProgram   String       @default(" DEFAULT)'
$good = 'studyProgram   String       @default("DEFAULT")'
$c2 = $c.Replace($bad, $good)
if ($c2 -eq $c) { Write-Host 'Pattern not found' }
[IO.File]::WriteAllText('prisma\schema.prisma', $c2)
Write-Host 'Done'