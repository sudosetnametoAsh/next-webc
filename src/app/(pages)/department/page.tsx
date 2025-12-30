"use client";
import SignOutButton from "@/components/auth/sign-out-button";
import Courses from "@/components/department/courses";

export default function Department() {
  return (
    <>
      <Courses />

      <SignOutButton />
    </>
  )
}