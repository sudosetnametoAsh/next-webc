import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClientEnrollmentGuard from '../../src/components/auth/client-enrollment-guard';
import EnrollmentNotice from '../../src/components/auth/enrollment-notice';
const client = new QueryClient();
const removed = new URLSearchParams(location.search).get('notice') === 'not-enrolled';
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    {removed ? <EnrollmentNotice /> : <ClientEnrollmentGuard userId="removed-officer">
      <div data-testid="private-department">Private department dashboard</div>
    </ClientEnrollmentGuard>}
  </QueryClientProvider>
);
