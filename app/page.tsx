import { redirect } from "next/navigation";

/** 공개 랜딩: 웰컴(소개) 페이지가 사이트 첫 화면입니다. 학생 홈은 `/student`입니다. */
export default function Home() {
	redirect("/welcome");
}
