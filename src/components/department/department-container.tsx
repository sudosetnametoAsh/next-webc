'use client';
import SignOutButton from '../auth/sign-out-button';
import StudentList from './student-list';
import Toolbar from './toolbar';
import { DepartmentProvider } from '@/context/deparment';

export default function DepartmentContainer() {
   return (
      <>
         <DepartmentProvider>
            <section className="flex justify-center">
               <Toolbar />
            </section>
            <main className="flex justify-center">
               <StudentList />
            </main>
         </DepartmentProvider>

         <SignOutButton />
      </>
   );
}
