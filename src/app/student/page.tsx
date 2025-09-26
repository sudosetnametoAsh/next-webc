"use client";

import SignOutButton from "@/components/sign-out-button";
import StudentTable from "@/components/student/student-table";
import { useEffect } from "react";


export default function Students() {
  useEffect(() => {
    const getData = async () => {
      const data = await fetch("/api/students")
      const res = await data.json()
      console.log(res)
    }
    getData()

  },[])

  return (
    <>
      <StudentTable />

      <SignOutButton />
    </>


  )
}