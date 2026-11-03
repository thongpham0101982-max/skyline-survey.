import React from 'react';
import { getIntlExamsWorkspaceData } from './actions';
import IntlExamsWorkspaceClient from './IntlExamsWorkspaceClient';

export const dynamic = 'force-dynamic';

export default async function InternationalExamsPage() {
  const initialData = await getIntlExamsWorkspaceData({ academicYear: '2026-2027' });
  return <IntlExamsWorkspaceClient initialData={initialData} />;
}
