const fs = require('fs'); 
let c = require('fs').readFileSync('src/app/login/client.tsx','utf8');  
c = c.replace('ArrowRight, Eye, EyeOff, AlertCircle', 'Eye, EyeOff, AlertCircle, CheckCircle2, Loader2'); 
const newState =   const [loadingSteps, setLoadingSteps] = useState([]);  
c = c.replace('  const [showPassword, setShowPassword] = useState(false)', newState + '\n  const [showPassword, setShowPassword] = useState(false)'); 
