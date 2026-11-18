"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  Printer,
  Edit3,
  MessageSquare,
  UserCheck,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Users,
  BookOpen,
  ExternalLink,
  Send,
  PenTool,
  ShieldCheck,
  LayoutTemplate,
  CheckCircle2,
  Upload,
  RotateCcw,
  Award,
  Sliders,
} from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

const SKYLINE_LOGO_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABcAAAAF0CAMAAAAzeWqgAAAAFVBMVEVMaXEBpJ0BpJ0BopoBo5wBpJ0BpJ0UsTVhAAAABnRSTlMAfqYoU9aIPHHIAAAACXBIWXMAAC4jAAAuIwF4pT92AAAbjklEQVR4nO3d65brKK+F4eKU+7/kHkktd+Xg2IABSfA+v/b49upUTOwZRWDz8wMA0CCE+BCk3wgAIC+0nfM+pdsfl/EfAgBE3GP7LbU3yUeZ9wQAOBDu5fZebP9Gt3f0TwBAlxDi9+C+Je/ofAOANiQ3AMwX3UH6HQIASqL7cnaHEIh+ABgb3fcVJqFmcbj7XWn4vGoleUeMA4C67L7PeX5bZvg/T4ADQIvsPkjae8/k6urw1xekgw4A14XDuvuWcpL2EdynuX1fJn5ftEJyA8BVIbrD0E2nhffhfT1/we1IbQBoJsTj4D3rmpx0zLfgplECAAO7JieV93l00+EGgA7C4XTlyaOozsp2HoYCADLhfTtYKXhateeuVAEAFDopng/6Jid1Nw0TAOgnHK82OSi9zxeIk90A0EmIJ32Tb6X3WeFNdgOAZOmd9h9Ictzx5jEmACDb9f6S3sdTnRTeANDZWePktltFH/dbzu/MBAD0XS54213sfVixE94AIN72vu0tOTn8rwhvAFCQ3mmnc3LUN6nYwgEAMCK9T0pvwhsA5Gct02caHz1O9vChKACAUem9M2152Dih9AaAAcJpeidXkt5fb9O535uZbn7AIQHAAkJF4/swvePJQ1EStTkAyLROKtL7qVWeaIwDwHXB3UqL7/L0fr4piM44ALQQz1onH4lcnt7P92YmT3oDwJh5y5DdK99N79f78VlTCABjiu/0lrfl6f38H5DeADCm8317a3YctE52u9qv6U3jGwAGLTtJLrd1kpHe798FAIA6xb2Tg/9gry/ynt60TgBApHcSjlonp+lN6wQARq07ub0m7lHxvRPNb/+c4htAlscTNm7Je7ZbbNX6PqjW9+6lfH95im8AecJrvni2f7na+j6I+53i+32ak7vlAeT7jBu2gXly+rSqt37HwbKTnWh+/9csOwFQJO6mDW3YzPgOeb2TnWh+L9WZuATQLKY+AsWlrw+rnpI7S+/XWP7eO8nZTI3eCYC2fd635HEr1YmuML5LeicfWc8PHgD1vt4z+BLYv8vpVigW3Wl8v3yRfe+17PROPv4xrW8AF31tATxn+L9Cc/LIcUXxfdD63umdfIzyKj9pAHT1/dEdTz/x3fQ/+l1ZfB+0vj9e+qPRsndXJgBU+drK/SvDw79/MmknxbWK74/h+azUJx1CAFK+L6b4v+h28+ZPLFo4WBTfH/92wuEDIO08lv7/F5NlUGwU359TBJ+vPNnQATDw8Cb3dvtPmmcKLnaL78+5BeIbgESE/+bT3z+YZEVK8J3ie2eRCvENoKvTJ6L+5dIMKyn8WXw/h25JfO88bIb4BiAd4dtylAkiyZ3F960uvndmhM2PFQDzufbIqr//v+lWeCxpfn+P7487cnZel3XfAEb5K7L3Q+3pUYZu5u12fmqq752xMztIAKZ52uxfHD0lvNEi3J3G91PTw2XH995NrZNM9wKYo0B1L7N//mfC/snt74upIL5z/hEAiIZcis9hZW2CLpx3T2630CS+jf4+AWDdYc6l8Nxl8XN1T27bERXcNL8b38a+2QAs0gm/+ecS3U6lGc+7J4+jCyEW7HS5+6XA3CUApctRbjef7KWVvzXgcuKb5jcAC/0GM0V4HBbfFkYDwOwKMi/OMHl55r2w3v+GM/J7BMDSbZTXcPuZvfxO7/G9Ozh0TwBokV+4Km4ctCi/U8yZEFU8CADWk98IV9s7aFF+u7eXTKZGAMCiCuLPz1p++5DTWaJ7AsBwI1xhByE2756E/W8E7twBYDvB1a1GaVB+u6yekspfHwBQEoPe4K2XR976Il/im/IbwAwJrqiNUjABe8sK5m9fCExeAlCsIAu1VKMlnZ9bTjB/mw5V9JUFABerWTfH7GUKWb9CVBwtADQKRD/D7GXM+gKj/AYwWYJLx9r19onPez0FX1UAMFOCX26fpJh1L5CWdj8ANM3FaHj1ic97OcpvAJMmuLPaPkkh7+UovwFMm+DeZn67l5f7vjMms5cAJk5wiYy72j5JIe9wWTwIwJyy+cFobfWge36xgo3pAcCAshLXmWqfpJB3pDw4FsAKCe4N5bfPfDHaJwCs0prgF1d/p5h3kLRPABhW1mgeNZV5cfoyt/ymfQLAtKQwwS9OX7rM7wLaJwCMK2w2R1P5HQ6OjvYJAOtKpwud8ulLl1d+c/MOgAmEwoT0VvI7HLwUzz4BMIXSJR9e0bfJwXs7mgml/Q1gEqWLPpLeh8eGrEqe9jeAaZROG/ZqIF/Ob5/znUT7G8BMShvPfTLw+t6XPuMnBe1vAFMpbz0HhZs33O63VoZ4/HuC/AYwmfLiNyrM7wxMXwKYjpNO8DH5Hdu+aQDQwMuG4ZD8TkxfAphSkkxw8hsAht5DE23l9w8ATCqKTQkOyW/f5r0CgEZeKMHJbwC4Kokk+JD8di3GBwDUqnmU1OU+OPkNAEI3s0fp++czsPwbwPz86HQkvwGgkTQ2H68+/zsL+Q1gCVWJGlTnd2g7QgCglRuYkVf3T8tCfgNYRhp3kzr5DQAtVbU1qhK8Zsa0VOgwQgCgVRz0oBHyGwBa80NuVR9xA0/oM0AAoFXd2hCvbwF46DVCAKBV7H+7+ogFhKHfCAGAVr77DTMDFqCEjgMEAFqF3pE5YAIzdh0hAJiriZK9mHDABGbsPEIAoFVdiZzUTGDG3gMEAJM1UbySCUzXf4QAQCvXLzn7T2C6AQMEAGqlXr2L/hOYfsgAAYBWtY2OIN4A94NGCAAma6Ik6QZ4GjVAADBbE8XLNsATN/AAQOgwhdh/BXgYOEIAoFXtdGMUbICHoSMEAFql1l2M7g2UOHaAAECr2HgesfsKQjd4gABArdQ0SLs3UPzwAQIArULLVkb3TeiTwAgBgFbVq0bC+AZKYgITAJ6kZtVw9wZKEBkgANCqOnbd6Fswo9AIAYBWvlGg9m6Ae6kBAgCtQpuWRvcG+A8AoNU8ZhrYAE80wAHgU7qe4DTAAUBCvFwXd89vJz1GAKBT/fxjelTG3IEJAEKuFNDJuf6PAP8BAEhtY3lJkB4fAFCr/z5oVzjp4QEAxfpvpFMvSQ8OAKjWvY9dL0iPDQCo1n8vtFpRemgAQDmt85heemAAQDul85hJelwAQD+dJXiQHhYA0E9lCe6kRwUALFC4lDBJjwkA2KBvKWGQHhIAsEHdUkInPSIAYIWyEjxJjwcAmKGsBA/S4wEAdqhaSuikRwMADNG0lDBJDwYAmKKoBI/SYwEApugpwb30UACAMWru5gnSIwEA1tx0cNLjAADm6CjBk/QwAIBBKu7midKjAAAGabibx0sPAgCYpKAED9JjAAAmyZfgTnoIAMAo6bt5kvQAAIBV0nfzROkBAACzZEvwJH34AGCXbAkepQ8fAAyTLMG99MEDgGWSJXiQPngAME3uhnoKcAC4RizAKcABwGYJzj08AGD0hnoKcACweUM9BTgAGC3BpQ8aAGYgUYJTgAOA0RKcDjgA2CzBKcABwOgN9RTgAGDzhnpuwgQAoyU4BTgA2CzBKcABwGgJTgEOADZLcApwADD6TCs24gGApoblNzthAoDREpybeADA6A310scJANMZVIJTgAOA0RKcNYQAYPOZVqwhBACjJThrCAHAZgnOGkIAMFqCM4UJAEZvqGcKEwBsPtOKKUwAMFqCM4UJADZLcKYwAcBoCc4UJgAYvaGeKUwA6KhjftNBAQCjJTgdFAAwejcPHRQAsHlDPR0UADBagtNBAQCjJTgdFACwWYLTQQEAoyU4HRQAMHpDPR0UALB5Qz0dFAAwWoLTQQEAoyU4HRQAsHlDPR0UABikdYDTQQEAoyU4e/EAgNG7eaQPBwDW0fZuHnYzBgCjJTgdFAAwupSQRYQAYPNuHhYRAoDREpxFhABgdCkhLXAAGKtZgEsfCACsplUJTgscAIwuJaQFDgBG7+ahBQ4ARpcSSh8FACyoyVJCWuAAYLQE50EoACChQYDTAgcAo0sJeRAKANhcSkgLHACMLiWkBQ4ARucxuY0HAIwuJWQOEwCMzmNKv30AWNileUzmMAHA6Dwmc5gAYHQekzlMADA6j8kcJgAYncfkPkwAMDqPKf3OAWBx1fOYLEIBAKPzmCxCAQCj85gsQgEAo00UFqEAgNEmCotQAEBcqFqJIv2uAQB1TRQWoQCA0SYKi1AAQIXyJgqLUADA6FpCAhwAjD4ThVWEAGC0Dc4qwg5CCDHG6F7d/6cYAiMOoFEbXPrtziPcE9v7lPMBpJS89/dMJ88BVLfBpd/uDEJ0/squdvc0d646y98r/VetDxaAmtXgLAO/JsRL0b0b5aVJ7sZ8wJn3ifmall7q9Tsk5033Xkl7+MdlvmBd8bTYfl2Y7merRI651vuSNRRGTmSyDPyCtuH94jfINQV45lkVK6+qKFbMdL8EFAZ4bBTgD8l1yfB1A7zkQAjwWnHE6ZJySpwhAV5fSQsmeE5+909Q4T/fswLf+A4RvnCAF0xk0iKtEsaeK8cxPiDA69onOe+v56nodFwA0n+/dwXeKcJXDvD8BGcZeIXYrXNyKPn936r9A7y2fbKNl8yvQa/k/F+gAu8xlEsHePaDCQlwK/H9PeN6B3i4PBEpkuBecO70xRIVePsv4KUDPDvBWYU85Jm9rTiBAM/8wvINRq1hoOb8xTH5vUoF3no81w7w3EuGAC8jfI4ItFAutk+EEjwrv3/GWKUCb/yDfvEAz7xk2vytVUh2T75/XD0DvFnwjk1wFcsHN8tU4G0PZ/UAz7tkGv2tNRQ/Kaw1PzrAWzavBy4n1LF8cKPkbYyowFt+LS4f4FkJ3upvrUD+/HCDA7xN+2R4gitZPrjR8j5GVOANu2AEeEaCcye9kdnLo1OjV4A373oMWhCuZfngpuvBaqvA2yU4AZ5xSNyIaSm/v4RxpwDvsPZvyHJCNcsHN2tV4M2+HQnwjKKHZeC5FOT3t2DrE+BdGh79E1zR8sHNYhV4q7qQAD8fBlYR5lJxbsRxAd5r0UjvxSialg9ulqvA2wwxAX5+Hx0dFCvrT47OjA4B3q9S7pvgqpYPbtarwJv8yCHAzy9wCvBee0X38C2L2wd41/UimS8ezC8f3Ch7OyMq8BbdWQL8tAjnUYSZdJwZflCA925zdPt6yPmdJDDrs2IF3uDICPDnwdi7Jmmg9NjjqJ84JsAz20Vey/JytcsHN2tW4JfzhQA/iXDyE/fyE6NtgI+43abLgnB1ywc3DY/RUgV+dbgJ8PcBeTm+xArCXKXzN48d5+/bFG+8e/wP9x3rU9am9fuv+zMgwAc9sqT9JKnC5YObVSvwiwNOgH/fxDF54rv9EpTHvjlZn14IIcbo3D3Ss88LPyDAh22ec2mLn8rXk7rtuPNQ6q3Ar/1QI8C/KNzzHDlZ82WznCwhxnuUV18LzQI8d6O4Ft/+bUt9lcsHN+tW4JdGnQBHE+enbmp0FYboDnI89A7wzIflNmpEtExwncsHNytX4BcSvHGAxzBK7QGjj9N0aHwNfonx70ncKMCH7z3cbEG40uWDm0HDqbMCr//Cbxzg5OqqvEg03GM8s5JpEuC5D+tqebSNOjZalw9u1q7AqwefAEcTJ8nWs7Uatlnnw6ugRYBnLgtpvI6jyYJwtcsHN4tX4LUHSYCjCeG5sS3EQ88Az6yFm6dNvPx3FS8f3IwdUoUVeN1FQoCjCQWL00L0B5fA5QCXaJ80WhCuefng5vDNLVGBV32HEuBo4uzcFH+izNUAl2mfNFkQrnr54Obw3a1RgdecPQQ4mlCfEBcDXKp90mA5oe7lgxuFb294BV7x+40ARxPnp6bwYwkuBXjm4u+eyzh8bYIrXz64OXx/q1Tg5YdKgKOJnIQTjfALAZ5772XfacDKBeHalw9uDt/gOhV46U9VAhwjC8QL99KLBXjuU156p0zVckL1ywc3okOrqAIv/DwIcIzdTk0qw2sDPHfxyYCfF+XLCQ0sH9zkHpLdCjz/iWwFpxIBjvHbOXgXjQR4bvdkTAyWJnhOfktPLm/yjshyBe7zr5H84yXA0UbpE7yTdy4G3QGeHd+jEqZsOaGJ5YMbDcPbtwL32b/mCj4WAhyiW9IPy/HyAM+P73GzsyUJbmP54GaBCjy/H5f/i44ARxvX5m/u2zz0zfHSAM9dOXg/Mkee9tkLwo0sH9ysUIGXPI27xTPeCXB0L8E/t+tREOCvG+udcCrX+1hZPrjRNMTdKvCiyyTr0yHA0Ur1PpZDYjw7wMPbE2rP3my0+E35eOeqrtZFKvCS6f6coybA0UqTRbB/UtsUP469bWPl8z3bJNsnWYdiM7+XqcBLEjxjKpMAh7rS8EnyrVK8w5vTmSyZ1Cw/+WeZCrztVGbjAPdD6Jk6x4CQbFOL93hvYs8GyI8AK/m9UAVe1G2MM25qLP3oYnzT7+RIV3a07xTgEu2TRgmurwZaqAIvulBODp0Ah4Ea/J8rId7+nYmG4LUE17T85J+lKvCS0/H4txIBDnXt2S4h3jrAxecA/VT5vVgFXnKhHJ5pBDi0tWfPP/+aR6k0DnAFPWRv9atn12IVeKupTAIcrQ05Q3wUDXAVPeS6Q9KZ38tV4EWlzveTnQCHxSK8PMNbBriWDIw2fzrsWq4CbzOVSYCjg4IHiYzK8IYBricDo+H3/ma9CrzJVCYBji7coAjP3h/CzdU+qUxwtfm9ZAXeYCqTAIfxCM9cjt2wAte0iMMNvHJq7rnLvgVryQq86Bt49y8S4Oim6Jl+l06IOLYHrqmO9eMunK4TBmtW4EUTRnujQICjozCskxKHrkLRMot5VzDCF9917Whl/dlFK/CiRN15BQIcc2T4WYQ3Xgeup42SX8JdjcGu12vXd664Ai+K1M/CgQDHLBl+3AtvfSemnjZKHHXZdP22W7cCLzk3PxKcAMcQcUSIu5HPQtHTRsm8JC+/3+qhyslfhd+WoyrwK1OZBDgmCvGDUO3wmC016wkHvdvqgcrJ38svYLgCvzCVSYBjqOCKN70p4kY+J1FLGyXr2K7/YOg6Tgqv+HEVeFGCv7wOAY7xQuwX437kg27FdnR4k4b8XFgtwAdW4NVTmQQ4JotxP/RJ5TraKBkH16BjLxfgt5/ZK/CyM/TvjxPgkBUeOd4yyP3QrSZ0zGWev80Rf6RfgIf5K/Ciqcz/o5kAhw4hNgtyP3avIA1tFD/il0LXAE/6fugMrsCrGuEEOBQG+cXWihu72ZuCNspp8daihBUMcL9CBV6U4P9++RHgUCpEV90jD4VXowufCh6Jq6CNcvYOB/yNa/F7kis/K1TgFVOZjQPcuyEufjAw5N4izz6p/z8Pm5RTyVAb5WSMmlSw+cNR8dedvgEeX4GXFcixfYDLVyKYUSi9Byg2uBqL2i7SS8JH5F/+aFQMTtQ3vhIVeNFJ5whw2BELGiq+SYCXrAsQbqOcvNMmb656YiInug6zTyZaRCrwopPOE+CwJGRneJsAL2qjyHb2CoejRvX0V1Z0JXWjK1OBl01lHk/t7L06AQ5JmXOLsU2A22mjHA+L2B7K+QNz9vUQVqnA2+0KToBDoazT27UKcCttlDRg3VZtCZ4VXU7d16NUBd5srR8BDpXiyAA30kbxIxbeVuZKVnSdNcHHL0QRq8Bb3bbgil+ZAMcI55naMMCLcitvh+UOjpf3tvorwVXsbOzzvtZOP9OwTgV+oV91KcDFl8NiDWFogBe1UYSuAad5kWObojMtVIE3aYSXBzi32CwuuKjjam8b4AbaKPYD/PRLeXSCi1bgLRLcFR+ViRMFfWPEuwG/deOoVSgVbRSRucwJCqukbGRlK/AGU5mu+D3ylJLFbddg9xA/q8BD89ZfSVNSoI0yQYA7ZSMrXIFfT/DyAGcWc20vJ4fv2E45TdMOczclP2nH/xSdIMB/pEb28QTMoK8Cv7oYZf9jP/xP6KEs7eN8Sy4GifxOXSbfNbdRZgjwvPF1fZ5BrzLAry1GcVaevA4lds+N1LoUz7gZ0/VZPeX0tlFmCPDzacx/hxM6bB4SFLZQLk5lupqvSVYSruvg/L2neJOiNGQ9l7DN0wgttVFmCPD8nzh1cyyHuz7prMAvJbiru+WVPviqzlfyXovxkPtAwtTv/gWtbZQpAjy3BH+Mbm6Ih7xNnrQG+IWpTFe7XLNP4xPaZdYKybvSM6RwB3vX8Qa0kjbKwOCcIsCLJ+3S41yKITyfTvftlGJ07p7a+SeN0hZKzaicfOx5/3FKyXfEN4Q+pRMuyf+7+r683u91WHQVVm6pVtT3K9hrbeDP0TkCvP6Z45fprcCrpzK/fOwKdsVkvaJGV06M9PDv2/n+fw7d1Dh260oOu7N+kgAvaaKsE+CVjXDX7zErlxHg+ty06P4MH4VtlEkCvM1j+GoobqHUJvi3j/2mAAGujoov9kEPYSs51jFzmbMEuFgTRXUFXvf79tvHrqGHQoCro+G0+H6hNH6KZlFFNKKNMk2ASzVRtAd4xW8Tp7jUIsDVuenwpeBt/hhkZW2UaQJcKl50t1CqBsbpmyr+HwGujYav9YMzo/1z7HW1UeYJcKEzSX0FXj4wTvG1SoBro+Bb/SiLO2xEoqqNMlGAy0xkGgjw0qlMp/hiJcCVkVv/lZeTXXaSKmn7d76zfqYAF0lw/S2U4uR1iq9WAlwZseVfmUncZytAPW2UqQJc4je+hQq8sGZwii9XAlwZ+R9lxxHZaS/Xoh+1PXN0rgAXSHAjAV4SvU7x9UqA6yL/m+zkCum2GbeSNspkAd5iT98ZWyhF321O8QVLgOsi/pPsLIW7BbiSNspsAT78vgIrFXjBd9vhxy6c4AS4LllP6e7p7LFR/QJcRxtlvgAfXBTYCfDsE+74Y5ddS0iAa5P9sO4ezivbjgFe2Ebpc+pOGOBj2yhmWij5320nH7toDU6AayQU4jmP/Osa4EXFYp8HFM4Y4GWP7l2nAs8tn522eYYnBLha0Y3tXuaVtH0DXL6NMmeAD+yj2Arwn5BxkTnFU1cEuGrDSvGUuzli5wAva6N0mMucNcB/wqCQMdVCuTsfl4yPXawIJ8D1C0XboFVIPj95uwd4WTXTvI0ybYCPmiE3VoHnFOFOWZfqGQG+ei2eXXuPCvCyS2FoPWY8wH9+Yteu3GNnzR9zAX56xjkNg/sFAW5J4Z7Ep5Iv3jZ7QIBn9SX/jqHtKTx3gN8PsHnM/O6I/HVLVu0tlN/36Jt87OMznAC3GeOXczx5VxW3IwJcso0yfYA/YqZFFfC7l/b33DZUgT/+5vfayKlqeL4iwM0K963mK3Ytvkd3/cce3YF2Z9Pfn4lvwouf1sLR8Y3aWVlvR+6+Yfb9MwmthjSo+hDu11STv7j/Qh0Q4OaFx8ny2IP++MLzhRceVujIneV4+s3s+7nDyQP09ShL3wvWzn8Txv2eMb/F5usvHel3BvwY8h9gRF3QYhyFzwAAAABJRU5ErkJggg=="

export type ReportTemplateType = "DETAILED_CONFIG" | "SUMMARY_STANDARD" | "CIRCULAR_TERM"

export const REPORT_PERIOD_OPTIONS = [
  { code: "KSĐN", label: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", label: "Giữa Học kỳ 1 (GK1)" },
  { code: "CK1", label: "Cuối Học kỳ 1 (CK1)" },
  { code: "HK1", label: "Tổng kết Học kỳ 1 (HK1)" },
  { code: "GK2", label: "Giữa Học kỳ 2 (GK2)" },
  { code: "CK2", label: "Cuối Học kỳ 2 (CK2)" },
  { code: "HK2", label: "Tổng kết Học kỳ 2 (HK2)" },
  { code: "CN", label: "Tổng kết Cả năm (CN)" },
]

export const REPORT_TEMPLATE_OPTIONS: Array<{
  code: ReportTemplateType
  label: string
  shortLabel: string
  description: string
}> = [
  {
    code: "DETAILED_CONFIG",
    label: "Mẫu 1: Bảng điểm Đặc thù theo Cấu hình Môn học",
    shortLabel: "Mẫu 1: Chi tiết theo Cấu hình môn",
    description:
      "Hiển thị đầy đủ Môn học, Đặc thù cấu hình kỳ, GVBM giảng dạy, Điểm thành phần, Điểm tổng hợp / Mức đạt và Nhận xét của GVBM.",
  },
  {
    code: "SUMMARY_STANDARD",
    label: "Mẫu 2: Phiếu Báo điểm & Nhận xét Tổng hợp (A4)",
    shortLabel: "Mẫu 2: Tổng hợp Điểm & Nhận xét",
    description:
      "Bố cục chuẩn 1 trang A4 gọn gàng gồm Môn học, GVBM giảng dạy, Kết quả (Điểm / Mức đạt) và Nhận xét chuyên môn.",
  },
  {
    code: "CIRCULAR_TERM",
    label: "Mẫu 3: Bảng điểm Tổng kết theo Thông tư (TT27 / TT22)",
    shortLabel: "Mẫu 3: Tổng kết Học kỳ (TT27/TT22)",
    description:
      "Kèm theo bảng đánh giá Năng lực & Phẩm chất (Tiểu học TT27) hoặc Kết quả Học tập, Rèn luyện & Khen thưởng (THCS/THPT TT22).",
  },
]

const RATING_LABELS_MAP: Record<string, string> = {
  T: "T (Hoàn thành tốt)",
  H: "H (Hoàn thành)",
  C: "C (Chưa hoàn thành)",
  Đ: "Đ (Đạt)",
  D_DAT: "Đ (Đạt)",
  CĐ: "CĐ (Chưa đạt)",
  CD: "CĐ (Chưa đạt)",
  A: "A (Tốt)",
  B: "B (Khá)",
  D: "D (Chưa đạt)",
  E: "E (Excellent)",
  S: "S (Satisfactory)",
  N: "N (Needs Improvement)",
  U: "U (Unsatisfactory)",
}

interface StudentSurveyReportModalProps {
  isOpen: boolean
  onClose: () => void
  initialStudentId?: string
  students: any[]
  subjects: any[]
  currentClass: any
  teacherName: string
  academicYearName: string
  selectedPeriod: string
  periodLabel: string
  onChangePeriod?: (newPeriod: string) => void
  initialTemplate?: ReportTemplateType
  homeroomSignatureProfile?: any
  onOpenEditFeedback?: (student: any) => void
}

export function StudentSurveyReportModal({
  isOpen,
  onClose,
  initialStudentId,
  students,
  subjects,
  currentClass,
  teacherName,
  academicYearName,
  selectedPeriod,
  periodLabel,
  onChangePeriod,
  initialTemplate,
  homeroomSignatureProfile,
  onOpenEditFeedback,
}: StudentSurveyReportModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students && students[0]?.studentId) || ""
  )
  const [reportTemplate, setReportTemplate] = useState<ReportTemplateType>(initialTemplate || "DETAILED_CONFIG")
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  // Digital Signature states for GVCN
  const [sigProfile, setSigProfile] = useState<any>(homeroomSignatureProfile || null)
  const [isSignedByGvcn, setIsSignedByGvcn] = useState<boolean>(true)
  const [signedTimestamp, setSignedTimestamp] = useState<string>("")
  const [showSignDrawer, setShowSignDrawer] = useState<boolean>(false)
  const [savingSignature, setSavingSignature] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [hasDrawnStroke, setHasDrawnStroke] = useState<boolean>(false)

  useEffect(() => {
    const now = new Date()
    setSignedTimestamp(
      now.toLocaleDateString("vi-VN") +
        " " +
        now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    )
  }, [isOpen])

  useEffect(() => {
    if (homeroomSignatureProfile) {
      setSigProfile(homeroomSignatureProfile)
    }
  }, [homeroomSignatureProfile])

  // Fetch teacher digital signature profile if not passed or when modal opens
  useEffect(() => {
    if (!isOpen) return
    fetch("/api/teacher/digital-signature/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.profile) {
          setSigProfile(json.profile)
        }
      })
      .catch(() => {})
  }, [isOpen])

  // Sync selectedStudentId when initialStudentId changes
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId)
    } else if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].studentId)
    }
  }, [initialStudentId, students])

  // Sync initialTemplate when provided
  useEffect(() => {
    if (initialTemplate) {
      setReportTemplate(initialTemplate)
    }
  }, [initialTemplate])

  // Auto-select CIRCULAR_TERM template if user switches to HK1, HK2, CN
  useEffect(() => {
    if (!initialTemplate && ["HK1", "HK2", "CN"].includes(selectedPeriod)) {
      setReportTemplate("CIRCULAR_TERM")
    }
  }, [selectedPeriod, initialTemplate])

  // Initialize signature pad canvas
  useEffect(() => {
    if (showSignDrawer && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = "#003B3A"
        ctx.lineWidth = 2.5
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
      }
    }
  }, [showSignDrawer])

  if (!isOpen || !students || students.length === 0) return null

  const currentIndex = students.findIndex((s) => s.studentId === selectedStudentId)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const currentStudent = students[safeIndex] || students[0]

  const isPrimaryClass = (() => {
    const g = String(currentClass?.grade || currentClass?.className || "").replace(/\D/g, "")
    const gNum = parseInt(g, 10)
    return gNum >= 1 && gNum <= 5
  })()

  const getSchoolTitle = () => {
    const campusCode = (currentClass?.campus?.campusCode || currentClass?.campusCode || "").toUpperCase()
    const campusName = (
      currentClass?.campus?.campusName ||
      currentClass?.campus?.name ||
      currentClass?.campusName ||
      ""
    ).toUpperCase()
    const className = (currentClass?.className || "").toUpperCase()
    const combined = `${campusCode} ${campusName} ${className}`

    if (combined.includes("CS4") || combined.includes("HILL")) {
      return "TRƯỜNG TH, THCS & THPT SKY-LINE HILL"
    }
    return "TRƯỜNG TH, THCS & THPT SKY-LINE"
  }

  const schoolTitle = getSchoolTitle()
  const matchedPeriodOpt = REPORT_PERIOD_OPTIONS.find((p) => p.code === selectedPeriod)
  const cleanPeriodLabel = matchedPeriodOpt?.label || periodLabel || selectedPeriod || "Kỳ đánh giá"
  const reportMainTitle = `BẢNG ĐIỂM MÔN HỌC - ${cleanPeriodLabel.toUpperCase()}`
  const reportYearTitle = `NĂM HỌC: ${academicYearName || "2026 - 2027"}`

  const handlePrev = () => {
    if (safeIndex > 0) {
      setSelectedStudentId(students[safeIndex - 1].studentId)
    }
  }

  const handleNext = () => {
    if (safeIndex < students.length - 1) {
      setSelectedStudentId(students[safeIndex + 1].studentId)
    }
  }

  // Signature Pad Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    setHasDrawnStroke(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(clientX - rect.left, clientY - rect.top)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineTo(clientX - rect.left, clientY - rect.top)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasDrawnStroke(false)
    }
  }

  const handleSaveCanvasSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawnStroke) {
      toast.error("Vui lòng ký tên vào khung vẽ trước khi lưu!")
      return
    }
    const dataUrl = canvas.toDataURL("image/png")
    await saveSignatureToServer(dataUrl, "DRAWN")
  }

  const handleUploadSignatureFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = String(ev.target?.result || "")
      if (dataUrl.startsWith("data:image/")) {
        await saveSignatureToServer(dataUrl, "UPLOADED")
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const saveSignatureToServer = async (visualAppearanceUrl: string, appearanceType: "DRAWN" | "UPLOADED") => {
    try {
      setSavingSignature(true)
      const res = await fetch("/api/teacher/digital-signature/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualAppearanceUrl,
          appearanceType,
          signatureRoleText: "Giáo viên Chủ nhiệm",
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Không thể lưu chữ ký số")
      }
      setSigProfile((prev: any) => ({
        ...(prev || {}),
        visualAppearanceUrl,
        appearanceType,
        signatureRoleText: "Giáo viên Chủ nhiệm",
      }))
      setIsSignedByGvcn(true)
      const now = new Date()
      setSignedTimestamp(
        now.toLocaleDateString("vi-VN") +
          " " +
          now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      )
      setShowSignDrawer(false)
      toast.success("Đã ký số xác nhận bảng điểm GVCN thành công!")
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu chữ ký số")
    } finally {
      setSavingSignature(false)
    }
  }

  const formatSubjectScoreAndRating = (sub: any, info: any) => {
    const score = info?.score !== null && info?.score !== undefined && !isNaN(Number(info.score)) ? Number(info.score) : null
    const rating = info?.ratingValue ? String(info.ratingValue).trim() : null
    const evalMode = info?.evaluationMode || sub?.config?.evaluationMode || "SCORE"
    const evalModeLabel = info?.evaluationModeLabel || sub?.config?.evaluationModeLabel || "Điểm số & Nhận xét"
    const compList: Array<{ key: string; label: string; value: string }> = info?.formattedComponents || []
    const gvbmName = info?.teacherName || sub?.teacherName || "Chưa phân công"
    const remark = info?.remark ? String(info.remark).trim() : ""

    return {
      score,
      rating,
      ratingFullLabel: rating ? RATING_LABELS_MAP[rating.toUpperCase()] || rating : null,
      evalMode,
      evalModeLabel,
      compList,
      gvbmName,
      remark,
    }
  }

  const generateStudentHtml = (student: any) => {
    const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "-"
    const sigUrl = sigProfile?.visualAppearanceUrl || null
    const sigSerial = sigProfile?.serialNumber || `SKL-DS-${(currentClass?.className || "CLS").replace(/\W/g, "")}`

    const isDetailed = reportTemplate === "DETAILED_CONFIG"

    const tableHeaderHtml = isDetailed
      ? `
        <tr>
          <th class="text-center" style="width: 34px;">STT</th>
          <th style="width: 155px;">Môn học & Đặc thù</th>
          <th style="width: 115px;">GVBM giảng dạy</th>
          <th style="width: 130px;">Điểm thành phần</th>
          <th class="text-center" style="width: 85px;">Điểm / Mức đạt</th>
          <th>Nhận xét của GVBM</th>
        </tr>
      `
      : `
        <tr>
          <th class="text-center" style="width: 36px;">STT</th>
          <th style="width: 165px;">Môn học</th>
          <th style="width: 125px;">GVBM giảng dạy</th>
          <th class="text-center" style="width: 95px;">Điểm / Mức đạt</th>
          <th>Nhận xét chuyên môn của GVBM</th>
        </tr>
      `

    const rowsHtml = subjects
      .map((sub: any, idx: number) => {
        const info = student.subjectGrades?.[sub.id]
        const { score, rating, evalModeLabel, compList, gvbmName, remark } = formatSubjectScoreAndRating(sub, info)

        let resultBadgeHtml = '<span class="score-empty">-</span>'
        if (score !== null && rating) {
          let scoreClass = "score-weak"
          if (score >= 8.0) scoreClass = "score-good"
          else if (score >= 6.5) scoreClass = "score-fair"
          else if (score >= 5.0) scoreClass = "score-avg"
          resultBadgeHtml = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
              <span class="score-badge ${scoreClass}">${score.toFixed(1)}</span>
              <span class="rating-pill">Mức: <b>${rating}</b></span>
            </div>
          `
        } else if (score !== null) {
          let scoreClass = "score-weak"
          if (score >= 8.0) scoreClass = "score-good"
          else if (score >= 6.5) scoreClass = "score-fair"
          else if (score >= 5.0) scoreClass = "score-avg"
          resultBadgeHtml = `<span class="score-badge ${scoreClass}">${score.toFixed(1)}</span>`
        } else if (rating) {
          resultBadgeHtml = `<span class="score-badge score-good">${rating}</span>`
        }

        const compHtml =
          compList.length > 0
            ? compList
                .map((c) => `<span class="comp-chip"><b>${c.label}:</b> ${c.value}</span>`)
                .join(" ")
            : `<span style="color:#94a3b8; font-size:9px; font-style:italic;">${evalModeLabel}</span>`

        const remarkHtml = remark
          ? `<span>${remark}</span>`
          : `<span style="color:#94a3b8; font-style:italic;">—</span>`

        if (isDetailed) {
          return `
            <tr>
              <td class="stt">${idx + 1}</td>
              <td class="subj-name">
                <div>${sub.name}</div>
                <div class="subj-meta">${evalModeLabel}</div>
              </td>
              <td class="gvbm-cell">${gvbmName}</td>
              <td class="comp-cell">${compHtml}</td>
              <td class="score">${resultBadgeHtml}</td>
              <td class="remark-cell">${remarkHtml}</td>
            </tr>
          `
        }

        return `
          <tr>
            <td class="stt">${idx + 1}</td>
            <td class="subj-name">
              <div>${sub.name}</div>
              <div class="subj-meta">${evalModeLabel}</div>
            </td>
            <td class="gvbm-cell">${gvbmName}</td>
            <td class="score">${resultBadgeHtml}</td>
            <td class="remark-cell">${remarkHtml}</td>
          </tr>
        `
      })
      .join("")

    // Optional Term Summary block for Mẫu 3 (CIRCULAR_TERM)
    const tSum = student.termSummary
    const termSummaryHtml =
      reportTemplate === "CIRCULAR_TERM"
        ? `
        <div class="term-summary-box">
          <div class="remarks-header">TỔNG HỢP ĐÁNH GIÁ KẾT QUẢ GIÁO DỤC (${isPrimaryClass ? "THÔNG TƯ 27/2020/TT-BGDĐT" : "THÔNG TƯ 22/2021/TT-BGDĐT"}):</div>
          <div class="term-summary-grid">
            <div><span class="info-label">Điểm TB các môn tính điểm:</span> <b style="color:#003B3A;">${student.gpa !== null && student.gpa !== undefined ? Number(student.gpa).toFixed(1) : "—"}</b></div>
            <div><span class="info-label">${isPrimaryClass ? "Đánh giá KQGD:" : "Kết quả Học tập:"}</span> <b style="color:#047857;">${tSum?.academicRating || "Hoàn thành tốt / Tốt"}</b></div>
            <div><span class="info-label">${isPrimaryClass ? "Phẩm chất & Năng lực:" : "Kết quả Rèn luyện:"}</span> <b style="color:#0284c7;">${tSum?.conductRating || "Tốt (T)"}</b></div>
            <div><span class="info-label">Danh hiệu / Khen thưởng:</span> <b>${tSum?.reward || "Học sinh Tiêu biểu / Xuất sắc"}</b></div>
          </div>
        </div>
      `
        : ""

    const gvcnSignatureHtml = isSignedByGvcn
      ? `
        <div class="digital-sig-stamp">
          ${sigUrl ? `<img src="${sigUrl}" alt="Chữ ký GVCN" class="sig-img" />` : `<div class="sig-script">${teacherName}</div>`}
          <div class="sig-verified-badge">
            ✓ Đã ký số xác thực bởi GVCN: <b>${teacherName}</b><br/>
            <span>Serial: ${sigSerial} • Ngày ký: ${signedTimestamp}</span>
          </div>
        </div>
      `
      : `
        <div class="sig-space">
          <span class="sig-name">${teacherName}</span>
        </div>
      `

    return `
      <div class="page-card">
        <div class="header-row">
          <div class="school-brand">
            <img src="${SKYLINE_LOGO_BASE64}" alt="Sky-Line" class="school-logo-img" />
            <div class="school-divider"></div>
            <div>
              <div class="school-title">${schoolTitle}</div>
            </div>
          </div>
          <div class="system-info">
            <div class="system-title">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
            <div class="system-slogan">Nơi Khởi nguồn hạnh phúc</div>
            <div class="class-badge">Lớp: <b>${currentClass?.className || ""}</b></div>
          </div>
        </div>

        <div class="report-heading">
          <h1 class="report-title">${reportMainTitle}</h1>
          <div class="year-badge">${reportYearTitle}</div>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Họ và tên học sinh:</span>
            <span class="info-val-highlight">${student.studentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Lớp:</span>
            <span class="info-val">${currentClass?.className || ""}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mã số học sinh:</span>
            <span class="info-val">${student.studentCode || "-"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Giáo viên chủ nhiệm (GVCN):</span>
            <span class="info-val">${teacherName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ngày sinh:</span>
            <span class="info-val">${dob}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kỳ đánh giá / Học kỳ:</span>
            <span class="info-val-blue">${cleanPeriodLabel}</span>
          </div>
        </div>

        <div class="section-bar">
          <div class="section-title">BẢNG ĐIỂM MÔN HỌC — ${cleanPeriodLabel.toUpperCase()}</div>
          <div class="section-count">${subjects.length} môn học</div>
        </div>

        <table>
          <thead>
            ${tableHeaderHtml}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${termSummaryHtml}

        <div class="remarks-box">
          <div class="remarks-header">NHẬN XÉT CHUNG CỦA GIÁO VIÊN CHỦ NHIỆM (GVCN):</div>
          <div class="remarks-content">
            ${
              student.teacherRemark ||
              `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả học tập của học sinh <b>${student.studentName}</b> trong kỳ <b>${cleanPeriodLabel}</b>. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực.`
            }
          </div>
        </div>

        ${
          student.parentFeedback
            ? `
        <div class="remarks-box" style="margin-top: 6px; border-color: #7dd3fc; background-color: #f0f9ff;">
          <div class="remarks-header" style="color: #0369a1;">Ý KIẾN CỦA PHỤ HUYNH HỌC SINH (PHHS):</div>
          <div class="remarks-content" style="font-style: italic; color: #1e293b;">
            "${student.parentFeedback}"
          </div>
        </div>
        `
            : ""
        }

        <div class="signature-section">
          <div class="signature-date">Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
          <div class="signature-grid">
            <div>
              <div class="sig-title">Phụ Huynh Học Sinh</div>
              <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
              <div class="sig-space"></div>
            </div>
            <div>
              <div class="sig-title">Giáo Viên Chủ Nhiệm</div>
              <div class="sig-sub">(Chữ ký số & Xác nhận)</div>
              ${gvcnSignatureHtml}
            </div>
            <div>
              <div class="sig-title">Ban Giám Hiệu</div>
              <div class="sig-sub">(Ký và đóng dấu)</div>
              <div class="sig-space"></div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  const getFullPrintHtml = (list: any[], docTitle: string) => {
    const bodyCards = list.map((st) => generateStudentHtml(st)).join("")
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      font-size: 10.5px;
      line-height: 1.35;
      font-variant-numeric: tabular-nums;
    }
    .page-card {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      background: #ffffff;
      padding: 1mm 0;
    }
    .page-card:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #003B3A;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .school-logo-img {
      height: 36px;
      width: auto;
      max-width: 150px;
      object-fit: contain;
    }
    .school-divider {
      width: 1.5px;
      height: 26px;
      background: #cbd5e1;
    }
    .school-title {
      font-size: 11.5px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      line-height: 1.25;
    }
    .system-info {
      text-align: right;
    }
    .system-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
    }
    .system-slogan {
      font-size: 9px;
      font-weight: 700;
      color: #008B85;
      font-style: italic;
    }
    .class-badge {
      font-size: 9px;
      color: #64748b;
    }
    .report-heading {
      text-align: center;
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      margin: 0 0 3px 0;
    }
    .year-badge {
      display: inline-block;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #00736E;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1.5px 10px;
      border-radius: 9999px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 16px;
    }
    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 2px;
      font-size: 10px;
    }
    .info-row:nth-last-child(-n+2) {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label {
      color: #475569;
      font-weight: 600;
    }
    .info-val {
      font-weight: 800;
      color: #0f172a;
    }
    .info-val-highlight {
      font-weight: 900;
      color: #003B3A;
    }
    .info-val-blue {
      font-weight: 900;
      color: #00736E;
    }
    .section-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      color: #003B3A;
    }
    .section-count {
      font-size: 9px;
      font-weight: 700;
      color: #00736E;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 8px;
      border: 1px solid #cbd5e1;
    }
    th {
      background: #003B3A;
      color: #ffffff;
      font-weight: 700;
      padding: 5px 7px;
      text-align: left;
      border-right: 1px solid #135e5b;
      font-size: 10px;
    }
    th.text-center {
      text-align: center;
    }
    td {
      padding: 4px 7px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    td.stt {
      text-align: center;
      font-weight: 700;
      color: #475569;
    }
    td.subj-name {
      font-weight: 800;
      color: #003B3A;
    }
    .subj-meta {
      font-size: 8.5px;
      font-weight: 600;
      color: #00736E;
      margin-top: 1px;
    }
    td.gvbm-cell {
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
    }
    td.comp-cell {
      font-size: 9px;
      color: #334155;
    }
    .comp-chip {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 1px 4px;
      margin: 1px 2px 1px 0;
      font-size: 8.5px;
    }
    td.score {
      text-align: center;
    }
    td.remark-cell {
      font-size: 9.5px;
      color: #1e293b;
      line-height: 1.3;
    }
    .score-badge {
      display: inline-block;
      min-width: 30px;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 900;
      font-size: 10px;
      border: 1px solid transparent;
    }
    .rating-pill {
      font-size: 8.5px;
      color: #00736E;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      padding: 0 4px;
      border-radius: 3px;
    }
    .score-good {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    .score-fair {
      background: #f0f9ff;
      color: #0284c7;
      border-color: #bae6fd;
    }
    .score-avg {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    .score-weak {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }
    .score-empty {
      color: #94a3b8;
      font-weight: bold;
    }
    .term-summary-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      padding: 6px 10px;
      margin-bottom: 7px;
    }
    .term-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      font-size: 9.5px;
      margin-top: 3px;
    }
    .remarks-box {
      border: 1px solid #99f6e4;
      background: #f0fdfa;
      border-radius: 8px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }
    .remarks-header {
      font-size: 9.5px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .remarks-content {
      font-size: 9.5px;
      color: #334155;
      line-height: 1.35;
    }
    .signature-section {
      font-size: 10px;
    }
    .signature-date {
      text-align: right;
      font-style: italic;
      color: #475569;
      margin-bottom: 3px;
      font-size: 9.5px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      text-align: center;
      align-items: start;
    }
    .sig-title {
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      font-size: 9.5px;
    }
    .sig-sub {
      font-size: 8px;
      font-style: italic;
      color: #64748b;
    }
    .sig-space {
      height: 54px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-name {
      font-weight: 900;
      color: #0f172a;
      font-size: 10px;
    }
    .digital-sig-stamp {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .sig-img {
      height: 38px;
      max-width: 130px;
      object-fit: contain;
    }
    .sig-script {
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 16px;
      font-weight: bold;
      color: #003B3A;
      padding: 4px 0;
    }
    .sig-verified-badge {
      border: 1px solid #059669;
      background: #ecfdf5;
      color: #065f46;
      border-radius: 5px;
      padding: 2px 6px;
      font-size: 8px;
      line-height: 1.25;
      text-align: center;
    }
    .sig-verified-badge span {
      color: #047857;
      font-size: 7.5px;
    }
  </style>
</head>
<body>
  ${bodyCards}
</body>
</html>`
  }

  const handlePrint = (mode: "single" | "all") => {
    setIsPrinting(true)
    const listToPrint = mode === "all" ? students : [currentStudent]
    const docTitle =
      mode === "all"
        ? `Bang_Diem_Lop_${currentClass?.className || "Lop"}_${selectedPeriod}`
        : `Bang_Diem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}`

    const htmlContent = getFullPrintHtml(listToPrint, docTitle)

    const oldIframe = document.getElementById("student-report-print-iframe")
    if (oldIframe) oldIframe.remove()

    const iframe = document.createElement("iframe")
    iframe.id = "student-report-print-iframe"
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "0"
    iframe.style.width = "210mm"
    iframe.style.height = "297mm"
    iframe.style.opacity = "0"
    iframe.style.border = "none"
    iframe.style.zIndex = "-9999"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) {
      setIsPrinting(false)
      return
    }

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()

    setTimeout(() => {
      setIsPrinting(false)
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
      }, 3000)
    }, 250)
  }

  const handleOpenHtmlTab = (mode: "single" | "all") => {
    const listToPrint = mode === "all" ? students : [currentStudent]
    const docTitle =
      mode === "all"
        ? `Bang_Diem_Lop_${currentClass?.className || "Lop"}_${selectedPeriod}`
        : `Bang_Diem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}`

    const htmlContent = getFullPrintHtml(listToPrint, docTitle)
    const printWin = window.open("", "_blank")
    if (printWin) {
      printWin.document.open()
      printWin.document.write(htmlContent)
      printWin.document.close()
    }
  }

  const handleExportExcel = (exportAll: boolean = false) => {
    const listToExport = exportAll ? students : [currentStudent]
    const wb = XLSX.utils.book_new()

    listToExport.forEach((st: any) => {
      const headerData = [
        [schoolTitle],
        ["HỆ THỐNG GIÁO DỤC SKY-LINE - Nơi Khởi nguồn hạnh phúc"],
        [""],
        [reportMainTitle],
        [reportYearTitle],
        [""],
        ["Họ và tên học sinh:", st.studentName, "", "Lớp:", currentClass?.className],
        ["Mã số học sinh:", st.studentCode, "", "GVCN:", teacherName],
        [
          "Ngày sinh:",
          st.dateOfBirth ? new Date(studentValueOrEmpty(st.dateOfBirth)).toLocaleDateString("vi-VN") : "-",
          "",
          "Kỳ đánh giá / Học kỳ:",
          cleanPeriodLabel,
        ],
        [""],
        [`BẢNG ĐIỂM MÔN HỌC - ${cleanPeriodLabel.toUpperCase()}`],
        [
          "STT",
          "Môn học",
          "Đặc thù cấu hình môn",
          "GVBM giảng dạy",
          "Điểm thành phần",
          "Điểm tổng hợp",
          "Mức đạt / Xếp loại",
          "Nhận xét của GVBM",
        ],
      ]

      const subjectRows = subjects.map((sub: any, idx: number) => {
        const info = st.subjectGrades?.[sub.id]
        const { score, rating, evalModeLabel, compList, gvbmName, remark } = formatSubjectScoreAndRating(sub, info)
        const compStr = compList.map((c) => `${c.label}: ${c.value}`).join("; ")
        return [
          idx + 1,
          sub.code ? `${sub.name} (${sub.code})` : sub.name,
          evalModeLabel,
          gvbmName,
          compStr || "-",
          score !== null ? score : "-",
          rating || "-",
          remark || "-",
        ]
      })

      const footerData = [
        [""],
        ["NHẬN XÉT CHUNG CỦA GIÁO VIÊN CHỦ NHIỆM (GVCN)"],
        [
          st.teacherRemark ||
            `Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả học tập của học sinh ${st.studentName} trong kỳ ${cleanPeriodLabel}.`,
        ],
      ]

      if (st.parentFeedback) {
        footerData.push([""], ["Ý KIẾN CỦA PHỤ HUYNH HỌC SINH (PHHS)"], [st.parentFeedback])
      }

      footerData.push(
        [""],
        [
          "",
          "",
          "",
          "",
          `Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`,
        ],
        ["PHỤ HUYNH HỌC SINH", "", "GIÁO VIÊN CHỦ NHIỆM (KÝ SỐ)", "", "BAN GIÁM HIỆU"],
        [
          "",
          "",
          isSignedByGvcn ? `${teacherName} (Đã ký số xác thực: ${signedTimestamp})` : teacherName,
          "",
          "",
        ]
      )

      const sheetData = [...headerData, ...subjectRows, ...footerData]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws["!cols"] = [
        { wch: 6 },
        { wch: 26 },
        { wch: 24 },
        { wch: 22 },
        { wch: 26 },
        { wch: 14 },
        { wch: 16 },
        { wch: 38 },
      ]

      const sheetName = (st.studentName || "HocSinh").replace(/[/\\?*\[\]]/g, "_").slice(0, 28)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    const fileName = exportAll
      ? `BangDiem_Lop_${currentClass?.className || "Lop"}_${selectedPeriod}.xlsx`
      : `BangDiem_${currentStudent?.studentName?.replace(/\s+/g, "_")}_${currentClass?.className}_${selectedPeriod}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  function studentValueOrEmpty(v: any) {
    return v || new Date()
  }

  const renderPreviewCard = (student: any) => {
    const isDetailed = reportTemplate === "DETAILED_CONFIG"
    const tSum = student.termSummary
    const sigUrl = sigProfile?.visualAppearanceUrl || null
    const sigSerial = sigProfile?.serialNumber || `SKL-DS-${(currentClass?.className || "CLS").replace(/\W/g, "")}`

    return (
      <div
        key={student.studentId}
        className="bg-white p-5 sm:p-7 font-sans text-slate-900 mx-auto max-w-[860px] shadow-lg rounded-2xl border border-[#E2E8F0] tabular-nums"
      >
        {/* Top Header with Sky-Line Logo */}
        <div className="flex items-start justify-between border-b-2 border-[#003B3A] pb-3 gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Sky-Line" className="h-10 w-auto object-contain shrink-0" />
            <div className="w-[1.5px] h-8 bg-slate-200 hidden sm:block"></div>
            <div>
              <div className="text-xs sm:text-sm font-black text-[#003B3A] tracking-tight uppercase leading-tight">
                {schoolTitle}
              </div>
              <div className="text-[11px] font-semibold text-[#00736E] mt-0.5">
                Phiếu báo cáo kết quả học tập chính thức • GVCN quản lý & ký số
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <div className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">
              HỆ THỐNG GIÁO DỤC SKY-LINE
            </div>
            <div className="text-[9px] font-bold text-[#008B85] italic">Nơi Khởi nguồn hạnh phúc</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Lớp: <span className="font-bold text-slate-800">{currentClass?.className}</span>
            </div>
          </div>
        </div>

        {/* Report Main Title */}
        <div className="text-center my-3.5 space-y-1">
          <h2 className="text-base sm:text-lg font-black text-[#003B3A] uppercase tracking-tight">
            {reportMainTitle}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-[11px] font-extrabold text-[#00736E]">
            <Calendar className="w-3 h-3 text-[#00A19A]" />
            <span>{reportYearTitle}</span>
          </div>
        </div>

        {/* Student & Class Information Box */}
        <div className="bg-[#F8FAFC] py-2.5 px-4 rounded-xl border border-[#E2E8F0] mb-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <User className="w-3 h-3 text-[#00A19A]" />
                Họ và tên học sinh:
              </span>
              <strong className="font-black text-[#003B3A] text-xs">{student.studentName}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1">
              <span className="text-slate-600 font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-[#00A19A]" />
                Lớp:
              </span>
              <strong className="font-black text-[#003B3A]">{currentClass?.className}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1">
              <span className="text-slate-600 font-semibold">Mã số học sinh:</span>
              <span className="font-bold text-slate-800">{student.studentCode}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1">
              <span className="text-slate-600 font-semibold">Giáo viên chủ nhiệm (GVCN):</span>
              <span className="font-bold text-slate-800">{teacherName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/70 pb-1 sm:border-b-0">
              <span className="text-slate-600 font-semibold">Ngày sinh:</span>
              <span className="font-semibold text-slate-700">
                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Kỳ đánh giá / Học kỳ:</span>
              <span className="font-black text-[#00736E]">{cleanPeriodLabel}</span>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
            <span>Bảng điểm môn học — {cleanPeriodLabel}</span>
          </h3>
          <span className="text-[11px] font-semibold text-[#00736E]">
            {subjects.length} môn học • {REPORT_TEMPLATE_OPTIONS.find((t) => t.code === reportTemplate)?.shortLabel}
          </span>
        </div>

        {/* Sky-Line Academic Ledger Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto mb-3.5">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-2.5 text-center w-10 text-white border-r border-white/10">STT</th>
                <th className="py-2.5 px-3 text-white border-r border-white/10">
                  Môn học & Đặc thù cấu hình
                </th>
                <th className="py-2.5 px-3 text-teal-100 border-r border-white/10">
                  GVBM giảng dạy
                </th>
                {isDetailed && (
                  <th className="py-2.5 px-3 text-teal-100 border-r border-white/10">
                    Điểm thành phần (Cấu hình kỳ)
                  </th>
                )}
                <th className="py-2.5 px-3 text-center w-28 text-[#5EEAD4] border-r border-white/10">
                  Điểm / Mức đạt
                </th>
                <th className="py-2.5 px-3 text-white">Nhận xét của GVBM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {subjects.map((sub: any, idx: number) => {
                const info = student.subjectGrades?.[sub.id]
                const { score, rating, evalModeLabel, compList, gvbmName, remark } = formatSubjectScoreAndRating(
                  sub,
                  info
                )

                return (
                  <tr key={sub.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-2.5 text-center font-semibold text-slate-500 border-r border-[#E2E8F0]">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3 border-r border-[#E2E8F0]">
                      <div className="font-bold text-[#003B3A]">
                        {sub.name}
                        {sub.code && (
                          <span className="text-[10px] font-normal text-slate-400 ml-1">({sub.code})</span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium text-[#00736E] mt-0.5">{evalModeLabel}</div>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-700 border-r border-[#E2E8F0]">
                      {gvbmName}
                    </td>

                    {isDetailed && (
                      <td className="py-2.5 px-3 border-r border-[#E2E8F0]">
                        {compList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {compList.map((c) => (
                              <span
                                key={c.key}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-medium text-slate-700"
                              >
                                <span className="text-slate-500">{c.label}:</span>
                                <strong className="font-bold text-slate-900">{c.value}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 italic">{evalModeLabel}</span>
                        )}
                      </td>
                    )}

                    <td className="py-2.5 px-3 text-center border-r border-[#E2E8F0]">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {score !== null && (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${
                              score >= 8.0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : score >= 6.5
                                  ? "bg-sky-50 text-sky-700 border-sky-300"
                                  : score >= 5.0
                                    ? "bg-amber-50 text-amber-700 border-amber-300"
                                    : "bg-rose-50 text-rose-700 border-rose-300"
                            }`}
                          >
                            {score.toFixed(1)}
                          </span>
                        )}
                        {rating && (
                          <span className="inline-block px-2 py-0.5 rounded bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[10.5px] font-bold">
                            Mức: {rating}
                          </span>
                        )}
                        {score === null && !rating && <span className="text-slate-400 font-bold">-</span>}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-[11px] text-slate-700 leading-relaxed">
                      {remark || <span className="text-slate-400 italic">Chưa có nhận xét bộ môn</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mẫu 3: Khối Tổng kết Học kỳ / Cả năm theo Thông tư */}
        {reportTemplate === "CIRCULAR_TERM" && (
          <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#F8FAFC] mb-3.5 space-y-2">
            <div className="text-[11px] font-bold text-[#003B3A] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#00A19A]" />
              <span>
                Tổng hợp đánh giá kết quả giáo dục ({isPrimaryClass ? "Thông tư 27/2020/TT-BGDĐT" : "Thông tư 22/2021/TT-BGDĐT"}):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 font-medium">ĐTB các môn tính điểm</div>
                <div className="text-sm font-black text-[#003B3A] mt-0.5">
                  {student.gpa !== null && student.gpa !== undefined ? Number(student.gpa).toFixed(1) : "—"}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 font-medium">
                  {isPrimaryClass ? "Đánh giá KQGD" : "Kết quả Học tập"}
                </div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {tSum?.academicRating || "Hoàn thành tốt / Tốt"}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 font-medium">
                  {isPrimaryClass ? "Năng lực & Phẩm chất" : "Kết quả Rèn luyện"}
                </div>
                <div className="text-sm font-bold text-[#00736E] mt-0.5">{tSum?.conductRating || "Tốt (T)"}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 font-medium">Khen thưởng / Danh hiệu</div>
                <div className="text-sm font-bold text-amber-700 mt-0.5">
                  {tSum?.reward || "Học sinh Tiêu biểu"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teacher's Remarks */}
        <div className="border border-[#CCFBF1] rounded-xl p-3 bg-[#F0FDFA]/60 mb-3 space-y-1">
          <div className="text-[11px] font-bold text-[#003B3A] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#00A19A]" />
              <span>Nhận xét chung của Giáo viên chủ nhiệm (GVCN):</span>
            </span>
            {onOpenEditFeedback && (
              <button
                type="button"
                onClick={() => onOpenEditFeedback(student)}
                className="text-[10px] font-semibold text-[#00736E] hover:text-[#003B3A] bg-white hover:bg-teal-50 px-2.5 py-0.5 rounded-md border border-[#CCFBF1] cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Chỉnh sửa nhận xét</span>
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-700 leading-relaxed font-medium pt-0.5">
            {student.teacherRemark ? (
              <span>{student.teacherRemark}</span>
            ) : (
              <span>
                Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả học tập của học sinh{" "}
                <strong className="text-[#003B3A]">{student.studentName}</strong> trong kỳ{" "}
                <strong>{cleanPeriodLabel}</strong>. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh
                thần học tập tích cực.
              </span>
            )}
          </div>
        </div>

        {/* Parent's Feedback (if available) */}
        {student.parentFeedback && (
          <div className="border border-sky-200 rounded-xl p-3 bg-sky-50/40 mb-3 space-y-0.5">
            <div className="text-[11px] font-bold text-sky-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>Ý kiến & Phản hồi của Phụ huynh học sinh (PHHS):</span>
            </div>
            <div className="text-[11px] text-slate-700 leading-relaxed font-medium pt-0.5 italic">
              &ldquo;{student.parentFeedback}&rdquo;
            </div>
          </div>
        )}

        {/* Signature Section (3 Columns with GVCN Digital Signature) */}
        <div className="pt-2 text-[11px] border-t border-slate-200 mt-3">
          <div className="text-right text-slate-500 italic mb-2.5 text-[10.5px]">
            Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
          </div>

          <div className="grid grid-cols-3 text-center gap-3 items-start">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-800 text-[11px]">Phụ huynh học sinh</div>
              <div className="text-[9.5px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
            </div>

            <div className="space-y-1 flex flex-col items-center">
              <div className="font-bold text-[#003B3A] text-[11px]">Giáo viên chủ nhiệm</div>
              <div className="text-[9.5px] text-slate-500 italic">(Chữ ký số & Xác nhận)</div>
              {isSignedByGvcn ? (
                <div className="mt-1 flex flex-col items-center gap-1">
                  {sigUrl ? (
                    <img
                      src={sigUrl}
                      alt="Chữ ký số GVCN"
                      className="h-11 max-w-[140px] object-contain mx-auto"
                    />
                  ) : (
                    <div className="text-base font-bold italic text-[#003B3A] py-1">{teacherName}</div>
                  )}
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9.5px] leading-tight text-center shadow-2xs">
                    <div className="font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Đã ký số: {teacherName}</span>
                    </div>
                    <div className="text-[8.5px] text-emerald-700 mt-0.5">
                      {sigSerial} • {signedTimestamp}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-end justify-center">
                  <span className="font-bold text-slate-900 text-[11px]">{teacherName}</span>
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="font-bold text-slate-800 text-[11px]">Ban giám hiệu</div>
              <div className="text-[9.5px] text-slate-500 italic">(Ký và đóng dấu)</div>
              <div className="h-16"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-[#F8FAFC] rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-[#E2E8F0] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Masthead Bar */}
        <div className="bg-[#003B3A] p-4 text-white flex flex-col gap-3 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 text-[#5EEAD4] flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <span>Xuất bảng điểm học tập & Ký số GVCN</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00A19A]/30 border border-[#5EEAD4]/40 text-[#5EEAD4] text-[11px] font-semibold">
                    {cleanPeriodLabel}
                  </span>
                </h3>
                <p className="text-[11px] text-teal-100">
                  Lớp <strong className="text-white">{currentClass?.className}</strong> • GVCN:{" "}
                  <strong className="text-[#5EEAD4]">{teacherName}</strong>
                </p>
              </div>
            </div>

            {/* Student Selector & Export Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/15 text-xs">
                <button
                  onClick={handlePrev}
                  disabled={safeIndex <= 0}
                  className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 text-white transition-all cursor-pointer"
                  title="Học sinh trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs outline-none py-1 px-1.5 cursor-pointer max-w-[190px] truncate tabular-nums"
                >
                  {students.map((st, idx) => (
                    <option key={st.studentId} value={st.studentId} className="text-slate-900">
                      {idx + 1}. {st.studentName} ({st.studentCode})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNext}
                  disabled={safeIndex >= students.length - 1}
                  className="p-1 rounded-lg hover:bg-white/20 disabled:opacity-30 text-white transition-all cursor-pointer"
                  title="Học sinh tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handlePrint("single")}
                disabled={isPrinting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isPrinting ? "Đang xử lý..." : "In / Xuất PDF (1 HS)"}</span>
              </button>

              <button
                onClick={() => handlePrint("all")}
                disabled={isPrinting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Users className="w-3.5 h-3.5" />
                <span>In cả lớp ({students.length} HS)</span>
              </button>

              <button
                onClick={() => handleExportExcel(false)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Xuất Excel bảng điểm học sinh đang chọn"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={() => handleOpenHtmlTab("single")}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Mở bảng điểm trong tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Second Control Strip: Chọn Kỳ đánh giá / Học kỳ + Chọn Mẫu điểm xuất + Ký chữ ký số GVCN */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2.5 border-t border-white/15 text-xs">
            {/* 1. Chọn Kỳ đánh giá / Học kỳ */}
            <div className="md:col-span-4 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-teal-100 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#5EEAD4]" />
                Chọn Kỳ đánh giá / Học kỳ:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => onChangePeriod?.(e.target.value)}
                className="w-full bg-white text-[#003B3A] font-bold rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5EEAD4] cursor-pointer"
              >
                {REPORT_PERIOD_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Chọn Mẫu điểm xuất */}
            <div className="md:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-teal-100 flex items-center gap-1">
                <LayoutTemplate className="w-3.5 h-3.5 text-[#5EEAD4]" />
                Chọn Mẫu điểm xuất:
              </label>
              <select
                value={reportTemplate}
                onChange={(e) => setReportTemplate(e.target.value as ReportTemplateType)}
                className="w-full bg-white text-[#003B3A] font-bold rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5EEAD4] cursor-pointer"
              >
                {REPORT_TEMPLATE_OPTIONS.map((tpl) => (
                  <option key={tpl.code} value={tpl.code}>
                    {tpl.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Chữ ký số GVCN */}
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-teal-100 flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-[#5EEAD4]" />
                Chữ ký số của GVCN:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsSignedByGvcn((prev) => !prev)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSignedByGvcn
                      ? "bg-emerald-500 text-white border-emerald-400 shadow-xs"
                      : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isSignedByGvcn ? "Đã bật Ký số" : "Chưa ký số"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignDrawer((prev) => !prev)}
                  className="px-2.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold transition-all cursor-pointer"
                  title="Vẽ chữ ký số hoặc tải ảnh chữ ký của GVCN"
                >
                  <PenTool className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Inline Digital Signature Pad Drawer for GVCN */}
          {showSignDrawer && (
            <div className="bg-white text-slate-800 rounded-xl p-4 border border-teal-200 shadow-lg space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#00A19A]" />
                  <span className="text-xs font-bold text-[#003B3A]">
                    Thiết lập & Ký chữ ký số Giáo viên chủ nhiệm ({teacherName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600">
                    Ký trực tiếp vào khung bên dưới hoặc tải ảnh chữ ký (PNG/JPG):
                  </div>
                  <div className="border-2 border-dashed border-teal-300 rounded-xl bg-[#F8FAFC] overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={110}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[110px] cursor-crosshair touch-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Xóa nét vẽ</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCanvasSignature}
                      disabled={savingSignature}
                      className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005B58] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      <span>{savingSignature ? "Đang lưu..." : "Lưu & Áp dụng chữ ký vẽ"}</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#00736E] border border-[#CCFBF1] text-xs font-semibold flex items-center gap-1 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh chữ ký</span>
                      <input type="file" accept="image/*" onChange={handleUploadSignatureFile} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 text-center space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">Mẫu chữ ký số hiện tại của GVCN:</div>
                  {sigProfile?.visualAppearanceUrl ? (
                    <img
                      src={sigProfile.visualAppearanceUrl}
                      alt="Chữ ký hiện tại"
                      className="h-14 max-w-[180px] object-contain mx-auto bg-white p-1 rounded border border-slate-200"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 italic py-4">
                      Chưa có ảnh chữ ký riêng (Đang dùng chữ ký định danh điện tử mặc định)
                    </div>
                  )}
                  <div className="text-[10.5px] font-semibold text-emerald-700">
                    ✓ Đồng bộ tự động với Hồ sơ Chữ ký số cá nhân (/teacher/chu-ky-so)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content (Live On-Screen Preview) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {renderPreviewCard(currentStudent)}
        </div>
      </div>
    </div>
  )
}
