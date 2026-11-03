"use client";

import { StudentInfoClient } from "../student-info/client";

export function KetQuaKhaoSatClient(props: any) {
  return <StudentInfoClient {...props} pageMode="ket-qua" />;
}
