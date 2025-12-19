"use client";
import SignOutButton from "@/components/button/sign-out-button";
import Courses from "@/components/department/courses";

export default function Department() {
  return (
    <>
      <Courses />

      <SignOutButton />
    </>
  )
}