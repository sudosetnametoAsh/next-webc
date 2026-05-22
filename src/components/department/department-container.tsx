"use client";
import React from "react";
import Header from "./header";
import MainContent from "./main-content";
import StatCard from "./stat-card";
import StudentList from "./client-list";
import Toolbar from "./toolbar";
import { DepartmentProvider } from "@/context/deparment";


export default function DepartmentContainer() {
  return (
    <DepartmentProvider>
      <header className="flex bg-[] mb-10 h-16 justify-center border-b border-[#E7E5E2]">
        <Header />
      </header>

      <section className="mb-5">
        <StatCard />
      </section>

      <main className="flex items-center flex-col">
        {/* <Toolbar />
        <StudentList /> */}
        <MainContent />
      </main>

    </DepartmentProvider>
  );
}
