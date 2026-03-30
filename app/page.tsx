"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Shuffle, UserRound, X } from "lucide-react";
import { supabase } from "../utils/supabase";
import { BottomTabNav } from "@/components/BottomTabNav";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";

type AnnouncementItem = {
	id: number;
	title: string;
	content: string;
	created_at: string;
};

type UnreadMaterialItem = {
	id: number;
	title: string;
	category: string;
	created_at: string;
};

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function relativeTimeKo(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return "방금 전";
	if (m < 60) return `${m}분 전`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}시간 전`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}일 전`;
	return toKoreanDate(iso);
}

const DAILY_VOCAB_LIST = [
	{
        word: "미봉책",
        tag: "오늘의 어휘",
        meaning:
            "‘꿰매어 깁는다’는 뜻에서 나온 말로, 당장의 위기나 허점을 임시로 메우며 넘기는 꾀를 가리킨다. 근본 해결 없이 상황만 봉합하는 계략이라는 뉘앙스가 있다.",
    },
    {
        word: "반면교사",
        tag: "오늘의 어휘",
        meaning:
            "‘거울’(鑑)을 보듯 남의 잘못이나 실패를 통해 스스로의 교훈으로 삼는다는 뜻이다. 비판만이 아니라 자기 성찰과 개선으로 이어지는 태도를 나타낸다.",
    },
    {
        word: "추상적",
        tag: "오늘의 어휘",
        meaning: "구체성이 없이 사실이나 현실에서 멀어져 막연하고 일반적인 것",
    },
    {
        word: "협정",
        tag: "오늘의 어휘",
        meaning: "서로 의논하여 결정함.",
    },
    {
        word: "망연히",
        tag: "오늘의 어휘",
        meaning: "아무 생각이 없이 멍한 태도로.",
    },
    {
        word: "쇠퇴",
        tag: "오늘의 어휘",
        meaning: "쇠하여 전보다 못하여 감.",
    },
    {
        word: "분개",
        tag: "오늘의 어휘",
        meaning: "몹시 분하게 여김.",
    },
    {
        word: "동반하다",
        tag: "오늘의 어휘",
        meaning: "함께 나타나다.",
    },
    {
        word: "인도하다",
        tag: "오늘의 어휘",
        meaning: "사물이나 권리 따위를 넘겨주다.",
    },
    {
        word: "선동",
        tag: "오늘의 어휘",
        meaning: "남을 부추기어 일을 일으키게 함.",
    },
    {
        word: "도태",
        tag: "오늘의 어휘",
        meaning: "여럿 중에서 불필요한 부분이 줄어 없어짐.",
    },
    {
        word: "부족하다",
        tag: "오늘의 어휘",
        meaning: "필요한 양이나 기준에 미치지 못하다.",
    },
    {
        word: "착안",
        tag: "오늘의 어휘",
        meaning: "어떤 일을 주의하여 보거나, 문제를 해결하기 위한 실마리를 잡음.",
    },
    {
        word: "겸양",
        tag: "오늘의 어휘",
        meaning: "겸손한 태도로 남에게 양보하거나 사양함.",
    },
    {
        word: "유구하다",
        tag: "오늘의 어휘",
        meaning: "길고 오래다. 유원하다.",
    },
    {
        word: "왕도",
        tag: "오늘의 어휘",
        meaning: "임금으로서 마땅히 지켜야 할 바른 도리.",
    },
    {
        word: "일관",
        tag: "오늘의 어휘",
        meaning: "하나의 방법이나 태도로 끝까지 밀고 나감.",
    },
    {
        word: "반영",
        tag: "오늘의 어휘",
        meaning: "어떤 일에 반사적으로 일어나는 영향을 드러냄.",
    },
    {
        word: "소생",
        tag: "오늘의 어휘",
        meaning: "거의 죽어 가다가 다시 살아남.",
    },
    {
        word: "선구적 면모",
        tag: "오늘의 어휘",
        meaning: "시대 조류를 앞서 받아들이고 새로운 길을 여는 특징.",
    },
    {
        word: "방임",
        tag: "오늘의 어휘",
        meaning: "되는 대로 내버려 둠.",
    },
    {
        word: "일면적",
        tag: "오늘의 어휘",
        meaning: "어느 한쪽 방면이나 측면으로만 치우치는 성질.",
    },
    {
        word: "수동적",
        tag: "오늘의 어휘",
        meaning: "다른 힘에 이끌려 스스로 움직이지 않는 태도.",
    },
    {
        word: "억설",
        tag: "오늘의 어휘",
        meaning: "추측이나 상상에 의한 일방적인 의견.",
    },
    {
        word: "위계",
        tag: "오늘의 어휘",
        meaning: "지위나 계층 따위의 등급.",
    },
    {
        word: "수라",
        tag: "오늘의 어휘",
        meaning: "임금의 밥을 이르는 궁중 용어.",
    },
    {
        word: "논증",
        tag: "오늘의 어휘",
        meaning: "상대의 신념이나 태도, 의견 등을 필자가 생각하는 방향으로 변화시키려는 진술 방식.",
    },
    {
        word: "우발적",
        tag: "오늘의 어휘",
        meaning: "어떤 일이 예기치 아니하게 우연히 일어나는.",
    },
    {
        word: "동일시",
        tag: "오늘의 어휘",
        meaning: "한 대상을 다른 대상과 같은 것으로 봄.",
    },
    {
        word: "심취",
        tag: "오늘의 어휘",
        meaning: "어떤 일이나 사람에 깊이 빠져 마음을 빼앗김.",
    },
    {
        word: "읍소",
        tag: "오늘의 어휘",
        meaning: "눈물을 흘리며 간절히 호소함.",
    },
    {
        word: "고증",
        tag: "오늘의 어휘",
        meaning: "예전에 있던 사물들의 시대, 가치, 내용 따위를 옛 문헌에 기초하여 이론적으로 밝힘.",
    },
    {
        word: "정당화",
        tag: "오늘의 어휘",
        meaning: "정당성이 없거나 의문이 있는 것을 무엇으로 둘러대어 정당한 것으로 만듦.",
    },
    {
        word: "수요자",
        tag: "오늘의 어휘",
        meaning: "어떤 상품을 구매하고 싶어 하는 사람.",
    },
    {
        word: "융기하다",
        tag: "오늘의 어휘",
        meaning: "높게 일어나 들뜨다.",
    },
    {
        word: "복리계산법",
        tag: "오늘의 어휘",
        meaning: "원금에 이자가 붙고, 그 이자에 다시 이자가 붙는 계산 방식.",
    },
    {
        word: "근황",
        tag: "오늘의 어휘",
        meaning: "요즈음의 상황.",
    },
    {
        word: "저속",
        tag: "오늘의 어휘",
        meaning: "품위가 낮고 속됨.",
    },
    {
        word: "감응",
        tag: "오늘의 어휘",
        meaning: "어떤 느낌을 받아 마음이 따라 움직임.",
    },
    {
        word: "구전",
        tag: "오늘의 어휘",
        meaning: "말로 전하여 내려옴.",
    },
    {
        word: "군더더기",
        tag: "오늘의 어휘",
        meaning: "쓸데없이 덧붙은 말이나 행동.",
    },
    {
        word: "조합",
        tag: "오늘의 어휘",
        meaning: "여럿을 한데 모아 한 덩어리로 짬.",
    },
    {
        word: "침소",
        tag: "오늘의 어휘",
        meaning: "사람이 잠을 자는 곳.",
    },
    {
        word: "심미성",
        tag: "오늘의 어휘",
        meaning: "아름다움을 살펴 찾을 수 있는 성질.",
    },
    {
        word: "체결",
        tag: "오늘의 어휘",
        meaning: "계약이나 조약 따위를 공식적으로 맺음.",
    },
    {
        word: "토로",
        tag: "오늘의 어휘",
        meaning: "마음에 있는 것을 죄다 드러내어서 말함.",
    },
    {
        word: "폄하하다",
        tag: "오늘의 어휘",
        meaning: "가치를 깎아내리다.",
    },
    {
        word: "수반하다",
        tag: "오늘의 어휘",
        meaning: "어떤 일과 더불어 생기다. 또는 그렇게 되게 하다.",
    },
    {
        word: "나래",
        tag: "오늘의 어휘",
        meaning: "날개.",
    },
    {
        word: "실체",
        tag: "오늘의 어휘",
        meaning: "어떤 대상의 실제 모습.",
    },
    {
        word: "논란",
        tag: "오늘의 어휘",
        meaning: "여럿이 서로 다른 주장을 하며 다툼.",
    },
    {
        word: "안분지족",
        tag: "오늘의 어휘",
        meaning: "편안한 마음으로 제 분수를 지키며 만족할 줄을 앎.",
    },
    {
        word: "동위원소",
        tag: "오늘의 어휘",
        meaning: "원자 번호는 같으나 질량수가 서로 다른 원소.",
    },
    {
        word: "박명",
        tag: "오늘의 어휘",
        meaning: "수명이 짧음, 복이 없고 팔자가 사나움.",
    },
    {
        word: "접수",
        tag: "오늘의 어휘",
        meaning: "돈이나 물건 따위를 받음.",
    },
    {
        word: "대기",
        tag: "오늘의 어휘",
        meaning: "천체의 표면을 둘러싸고 있는 기체.",
    },
    {
        word: "야기",
        tag: "오늘의 어휘",
        meaning: "어떠한 문제나 사태가 발생하여 나타남.",
    },
    {
        word: "확충",
        tag: "오늘의 어휘",
        meaning: "늘리고 넓혀 충실하게 함.",
    },
    {
        word: "임의",
        tag: "오늘의 어휘",
        meaning: "일정한 기준이나 원칙 없이 하고 싶은 대로 함.",
    },
    {
        word: "상충",
        tag: "오늘의 어휘",
        meaning: "맞지 아니하고 서로 어긋남.",
    },
    {
        word: "묘미",
        tag: "오늘의 어휘",
        meaning: "미묘한 재미나 흥취.",
    },
    {
        word: "이진법",
        tag: "오늘의 어휘",
        meaning: "숫자 0과 1만을 사용하여 둘씩 묶어서 윗자리로 올려 가는 표기법.",
    },
    {
        word: "내성적",
        tag: "오늘의 어휘",
        meaning: "겉으로 나타내지 않고 마음속으로만 생각하는 성격인.",
    },
    {
        word: "과인",
        tag: "오늘의 어휘",
        meaning: "덕이 적은 사람이라는 뜻으로, 임금이 자기를 낮추어 이르는 말.",
    },
    {
        word: "방조",
        tag: "오늘의 어휘",
        meaning: "남의 범죄 수행에 편의를 주는 행위.",
    },
    {
        word: "백설",
        tag: "오늘의 어휘",
        meaning: "하얀 눈.",
    },
    {
        word: "종사하다",
        tag: "오늘의 어휘",
        meaning: "어떤 일에 마음과 힘을 다하거나 일을 일삼아서 하다.",
    },
    {
        word: "해명",
        tag: "오늘의 어휘",
        meaning: "까닭이나 내용을 풀어서 밝힘.",
    },
    {
        word: "반입",
        tag: "오늘의 어휘",
        meaning: "물품을 어느 곳의 안으로 운반하여 들여오는 것.",
    },
    {
        word: "보편타당",
        tag: "오늘의 어휘",
        meaning: "여러 사람들이 인정할 수 있고, 논리적으로도 옳은.",
    },
    {
        word: "중첩",
        tag: "오늘의 어휘",
        meaning: "거듭 겹쳐지거나 포개어짐.",
    },
    {
        word: "몽매",
        tag: "오늘의 어휘",
        meaning: "어리석고 사리에 어두움.",
    },
    {
        word: "고양",
        tag: "오늘의 어휘",
        meaning: "높이 쳐들어 올림. 정신이나 기분 따위를 북돋워서 높임.",
    },
    {
        word: "참작",
        tag: "오늘의 어휘",
        meaning: "살펴서 도움이 되는 재료로 삼음.",
    },
    {
        word: "상보적",
        tag: "오늘의 어휘",
        meaning: "서로 모자란 부분을 보충하는 관계에 있는.",
    },
    {
        word: "노류장화",
        tag: "오늘의 어휘",
        meaning: "기생.",
    },
    {
        word: "삼공",
        tag: "오늘의 어휘",
        meaning: "삼정승.",
    },
    {
        word: "가긍하다",
        tag: "오늘의 어휘",
        meaning: "불쌍하고 가엾다.",
    },
    {
        word: "의거",
        tag: "오늘의 어휘",
        meaning: "어떤 사실이나 원리에 근거함.",
    },
    {
        word: "서까래",
        tag: "오늘의 어휘",
        meaning: "마룻대에서 도리 혹은 보에 걸쳐 지른 나무.",
    },
    {
        word: "괴리",
        tag: "오늘의 어휘",
        meaning: "서로 어그러져 동떨어짐.",
    },
    {
        word: "통칭하다",
        tag: "오늘의 어휘",
        meaning: "통틀어 가리키다.",
    },
    {
        word: "원유",
        tag: "오늘의 어휘",
        meaning: "땅속에서 뽑아낸, 정제하지 아니한 그대로의 기름.",
    },
    {
        word: "수렴하다",
        tag: "오늘의 어휘",
        meaning: "의견이나 사상 따위가 여럿으로 나뉘어 있는 것을 하나로 모아 정리하다.",
    },
    {
        word: "유포",
        tag: "오늘의 어휘",
        meaning: "세상에 널리 퍼지다.",
    },
    {
        word: "벽력",
        tag: "오늘의 어휘",
        meaning: "벼락.",
    },
    {
        word: "명제",
        tag: "오늘의 어휘",
        meaning: "논리적 판단의 내용과 주장을 언어나 기호로 표현한 것.",
    },
    {
        word: "계발",
        tag: "오늘의 어휘",
        meaning: "슬기나 재능, 사상 따위를 일깨워 줌.",
    },
    {
        word: "회수",
        tag: "오늘의 어휘",
        meaning: "도로 거두어들임.",
    },
    {
        word: "몰각",
        tag: "오늘의 어휘",
        meaning: "깨달아 인식하지 못함.",
    },
    {
        word: "고갈",
        tag: "오늘의 어휘",
        meaning: "물이 말라서 없어짐. 돈이나 물자 따위가 다하여 없어짐.",
    },
    {
        word: "묵수",
        tag: "오늘의 어휘",
        meaning: "자신의 생각을 굳게 지킴.",
    },
    {
        word: "탈속",
        tag: "오늘의 어휘",
        meaning: "현실적인 이익을 추구하는 마음으로부터 벗어남.",
    },
    {
        word: "소반",
        tag: "오늘의 어휘",
        meaning: "밥상.",
    },
    {
        word: "제고",
        tag: "오늘의 어휘",
        meaning: "쳐들어 높임.",
    },
    {
        word: "한중진미",
        tag: "오늘의 어휘",
        meaning: "한가한 가운데 느끼는 참다운 맛.",
    },
    {
        word: "철폐",
        tag: "오늘의 어휘",
        meaning: "어떤 제도나 규정 등을 폐지함.",
    },
    {
        word: "결여",
        tag: "오늘의 어휘",
        meaning: "빠져서 없음.",
    },
    {
        word: "전복",
        tag: "오늘의 어휘",
        meaning: "기존의 것을 부정하고 새로운 것을 일으킴.",
    },
    {
        word: "백미",
        tag: "오늘의 어휘",
        meaning: "여럿 가운데에서 가장 뛰어난 사람이나 훌륭한 물건.",
    },
    {
        word: "상쇄",
        tag: "오늘의 어휘",
        meaning: "상반되는 것이 서로 영향을 주어 효과가 없어지는 일.",
    },
    {
        word: "산발",
        tag: "오늘의 어휘",
        meaning: "때때로 여기저기 흩어져 발생함.",
    },
    {
        word: "근거",
        tag: "오늘의 어휘",
        meaning: "의논·의견 등에 그 근본이 되는 사실.",
    },
    {
        word: "시사",
        tag: "오늘의 어휘",
        meaning: "그 당시에 일어난 여러 가지 사회적 사건.",
    },
    {
        word: "기호",
        tag: "오늘의 어휘",
        meaning: "즐기고 좋아함.",
    },
    {
        word: "삼경",
        tag: "오늘의 어휘",
        meaning: "밤 11시 ~ 새벽 1시.",
    },
    {
        word: "낙찰",
        tag: "오늘의 어휘",
        meaning: "경쟁 입찰에서 그 권리를 얻음.",
    },
    {
        word: "추임새",
        tag: "오늘의 어휘",
        meaning: "고수나 청자가 창자의 노래에 맞추어 흥을 돋우는 소리.",
    },
    {
        word: "시사하다",
        tag: "오늘의 어휘",
        meaning: "어떤 것을 미리 간접적으로 표현해 주다.",
    },
    {
        word: "연장",
        tag: "오늘의 어휘",
        meaning: "시간이나 거리 따위를 길게 늘임.",
    },
    {
        word: "퇴색",
        tag: "오늘의 어휘",
        meaning: "햇볕이나 습기를 받아 빛이 변하다. 오래되어 변색하다.",
    },
    {
        word: "홍안",
        tag: "오늘의 어휘",
        meaning: "젊고 아름다운 얼굴, 붉은 얼굴.",
    },
    {
        word: "감광",
        tag: "오늘의 어휘",
        meaning: "빛에 감응하여 화학적 변화를 일으킴.",
    },
    {
        word: "유기적",
        tag: "오늘의 어휘",
        meaning: "전체를 구성하고 있는 각 부분이 서로 밀접하게 관련을 가지고 있어서 떼어 낼 수 없는 것.",
    },
    {
        word: "갈구",
        tag: "오늘의 어휘",
        meaning: "간절히 바라고 구함.",
    },
    {
        word: "모색하다",
        tag: "오늘의 어휘",
        meaning: "일이나 사건 따위를 해결할 수 있는 방법이나 실마리를 더듬어 찾다.",
    },
    {
        word: "현학",
        tag: "오늘의 어휘",
        meaning: "이론이 깊고 어려워 깨닫기 힘든 학문.",
    },
    {
        word: "더디다",
        tag: "오늘의 어휘",
        meaning: "느리다.",
    },
    {
        word: "띠집",
        tag: "오늘의 어휘",
        meaning: "풀로 만든 집.",
    },
    {
        word: "발상",
        tag: "오늘의 어휘",
        meaning: "어떤 생각을 해냄. 또는 그 생각.",
    },
    {
        word: "곡절",
        tag: "오늘의 어휘",
        meaning: "복잡한 사정이나 이유.",
    },
    {
        word: "파장",
        tag: "오늘의 어휘",
        meaning: "충격적인 일이 끼치는 영향 또는 그 기간.",
    },
    {
        word: "편협",
        tag: "오늘의 어휘",
        meaning: "한쪽으로 치우쳐 도량이 좁고 너그럽지 못함.",
    },
    {
        word: "회의",
        tag: "오늘의 어휘",
        meaning: "의심을 품음. 또는 마음 속에 품고 있는 의심.",
    },
    {
        word: "형이상학적",
        tag: "오늘의 어휘",
        meaning: "물질적 형태를 초월하여 정신적이고 철학적인 의미를 띠는.",
    },
    {
        word: "전개하다",
        tag: "오늘의 어휘",
        meaning: "내용을 진전시켜 펴 나가다.",
    },
    {
        word: "기제",
        tag: "오늘의 어휘",
        meaning: "어떤 현상이 일어나는 구조나 작동 방식.",
    },
    {
        word: "묘파",
        tag: "오늘의 어휘",
        meaning: "남김없이 밝히어 그려냄.",
    },
    {
        word: "시금석",
        tag: "오늘의 어휘",
        meaning: "가치, 능력, 역량 따위를 알아볼 수 있는 기준이 되는 사물.",
    },
    {
        word: "성문화",
        tag: "오늘의 어휘",
        meaning: "글이나 문서로 나타냄. 또는 문서로 정해짐.",
    },
    {
        word: "도식",
        tag: "오늘의 어휘",
        meaning: "사물의 구조, 관계, 변화 상태 따위를 일정한 양식으로 나타낸 그림.",
    },
    {
        word: "곡학아세",
        tag: "오늘의 어휘",
        meaning: "바른 길에서 벗어난 학문으로 세상 사람에게 아첨함.",
    },
    {
        word: "훈육",
        tag: "오늘의 어휘",
        meaning: "품성이나 도덕 따위를 가르쳐 기름.",
    },
    {
        word: "사바",
        tag: "오늘의 어휘",
        meaning: "세속적 세계.",
    },
    {
        word: "착상되다",
        tag: "오늘의 어휘",
        meaning: "어떤 일이나 창작의 실마리가 되는 생각이나 구상 따위가 잡히다.",
    },
    {
        word: "궤도",
        tag: "오늘의 어휘",
        meaning: "행성, 혜성, 인공위성 따위가 중력의 영향을 받아 다른 천체의 둘레를 돌면서 그리는 곡선의 길.",
    },
    {
        word: "소양",
        tag: "오늘의 어휘",
        meaning: "평소 닦아 놓은 학문이나 지식.",
    },
    {
        word: "관조",
        tag: "오늘의 어휘",
        meaning: "고요한 마음으로 사물이나 현상을 관찰하거나 비추어 봄.",
    },
    {
        word: "노복",
        tag: "오늘의 어휘",
        meaning: "종살이를 하는 남자.",
    },
    {
        word: "허다영재",
        tag: "오늘의 어휘",
        meaning: "수많은 슬기로운 사람들.",
    },
    {
        word: "감쇄하다",
        tag: "오늘의 어휘",
        meaning: "줄어 없어지다. 또는 줄여 없애다.",
    },
    {
        word: "잉여",
        tag: "오늘의 어휘",
        meaning: "필요에 따라 다 쓰고 난 뒤에 남은 나머지.",
    },
    {
        word: "변천",
        tag: "오늘의 어휘",
        meaning: "세월이 흐름에 따라 바뀌고 변함.",
    },
    {
        word: "티끌",
        tag: "오늘의 어휘",
        meaning: "먼지.",
    },
    {
        word: "지양",
        tag: "오늘의 어휘",
        meaning: "더 높은 단계로 오르기 위하여 어떤 것을 하지 않음.",
    },
    {
        word: "동조",
        tag: "오늘의 어휘",
        meaning: "남의 주장에 자기의 의견을 일치시키거나 보조를 맞춤.",
    },
    {
        word: "불활성 기체",
        tag: "오늘의 어휘",
        meaning: "다른 원소와 화학 반응을 일으키기 어려운 기체 원소.",
    },
    {
        word: "분간",
        tag: "오늘의 어휘",
        meaning: "대상이나 사물을 다른 것과 구별하여 냄.",
    },
    {
        word: "통제",
        tag: "오늘의 어휘",
        meaning: "관리하고 제한함.",
    },
    {
        word: "고수하다",
        tag: "오늘의 어휘",
        meaning: "차지한 물건이나 형세 따위를 굳게 지키다.",
    },
] as const;

function getDailyVocabIndex(length: number): number {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
	const m = Number(parts.find((p) => p.type === "month")?.value ?? 0);
	const d = Number(parts.find((p) => p.type === "day")?.value ?? 0);
	const dayKey = y * 10_000 + m * 100 + d;
	return dayKey % length;
}

export default function HomePage() {
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
	const [unreadMaterials, setUnreadMaterials] = useState<UnreadMaterialItem[]>([]);
	const [showPostDates, setShowPostDates] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [studentName, setStudentName] = useState("");
	const [targetUniversity, setTargetUniversity] = useState("");
	const [vocabShuffle, setVocabShuffle] = useState(0);
	const [activeVocabWord, setActiveVocabWord] = useState<string | null>(null);
	const [openAnnouncement, setOpenAnnouncement] = useState<AnnouncementItem | null>(null);

	useEffect(() => {
		if (!openAnnouncement) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpenAnnouncement(null);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [openAnnouncement]);

	useEffect(() => {
		let isMounted = true;

		const fetchHomeData = async () => {
			setIsLoading(true);
			setErrorMessage("");

			const [announcementResult, settingResult, profileRes, unreadRes] = await Promise.all([
				supabase
					.from("announcements")
					.select("id, title, content, created_at")
					.order("created_at", { ascending: false })
					.limit(12),
				supabase.from("home_settings").select("id, show_post_dates").eq("id", 1).maybeSingle(),
				fetch("/api/student/profile", { credentials: "same-origin" }),
				fetch("/api/student/unread-materials", { credentials: "same-origin" }),
			]);

			if (!isMounted) {
				return;
			}

			if (announcementResult.error) {
				setErrorMessage("홈 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setAnnouncements([]);
			} else {
				setAnnouncements((announcementResult.data ?? []) as AnnouncementItem[]);
			}

			if (!settingResult.error && settingResult.data) {
				const setting = settingResult.data as HomeSetting;
				setShowPostDates(setting.show_post_dates ?? true);
			}

			if (profileRes.ok) {
				const profileJson = (await profileRes.json()) as {
					name?: string;
					targetUniversity?: string;
				};
				setStudentName((profileJson.name ?? "").trim());
				setTargetUniversity((profileJson.targetUniversity ?? "").trim());
			} else {
				setStudentName("");
				setTargetUniversity("");
			}

			if (unreadRes.ok) {
				const unreadJson = (await unreadRes.json()) as { items?: UnreadMaterialItem[] };
				setUnreadMaterials(unreadJson.items ?? []);
			} else {
				setUnreadMaterials([]);
			}

			setIsLoading(false);
		};

		fetchHomeData();

		return () => {
			isMounted = false;
		};
	}, []);

	const n = DAILY_VOCAB_LIST.length;
	const baseIdx = getDailyVocabIndex(n);
	const offset = (baseIdx + vocabShuffle) % n;
	const vocabPair: (typeof DAILY_VOCAB_LIST)[number][] =
		n <= 1
			? [DAILY_VOCAB_LIST[0]]
			: [DAILY_VOCAB_LIST[offset], DAILY_VOCAB_LIST[(offset + 1) % n]];

	const activeMeaning =
		activeVocabWord === null
			? null
			: (DAILY_VOCAB_LIST.find((v) => v.word === activeVocabWord)?.meaning ?? null);

	const welcomeHeadline = studentName ? `${studentName} 학생 환영합니다` : "학생 환영합니다";
	const targetSubtitle = targetUniversity
		? `${targetUniversity}에 입학할 학생을 응원합니다`
		: "마이페이지에 목표 대학을 입력해주세요";

	return (
		<main className="relative min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
			<div className="border-b border-slate-200/80 bg-white pt-[max(0.5rem,env(safe-area-inset-top))] pb-3">
				<div className={`${STUDENT_APP_SHELL}`}>
					<div
						className="rounded-2xl bg-gradient-to-r from-brand to-brand-hover px-4 py-3.5 text-center shadow-md shadow-brand/25 sm:py-4"
						role="note"
						aria-label="브랜드 안내"
					>
						<p className="text-base font-bold tracking-tight text-white sm:text-lg">수능국어는 이정관</p>
					</div>
				</div>
			</div>

			<div className="app-home-top border-b border-slate-200/80 py-10 sm:py-12 md:py-14 pt-6 sm:pt-8">
				<div className={`${STUDENT_APP_SHELL}`}>
					<div className="flex items-center gap-4 sm:gap-5">
						<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand sm:h-[4.5rem] sm:w-[4.5rem]">
							<UserRound className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2} aria-hidden />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl md:text-2xl">{welcomeHeadline}</p>
							<p className="mt-1.5 text-sm font-medium leading-snug text-slate-500 sm:text-base">{targetSubtitle}</p>
						</div>
					</div>
				</div>
			</div>

			<section className="border-b border-slate-200/80 bg-white pb-4 pt-4">
				<div className={`${STUDENT_APP_SHELL} space-y-3`}>
					{isLoading ? <p className="text-sm text-slate-500">공지를 불러오는 중…</p> : null}
					{!isLoading && errorMessage ? (
						<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
					) : null}
					{!isLoading && !errorMessage && announcements.length === 0 ? (
						<p className="text-sm text-slate-500">등록된 공지가 없습니다.</p>
					) : null}
					{!isLoading && !errorMessage && announcements.length > 0
						? announcements.map((a) => (
								<button
									key={a.id}
									type="button"
									onClick={() => setOpenAnnouncement(a)}
									className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand to-brand-hover px-4 py-3.5 text-left text-white shadow-md shadow-brand/25 transition hover:opacity-[0.97] active:scale-[0.99]"
								>
									<div className="min-w-0">
										<p className="text-[11px] font-medium text-white/85">공지</p>
										<p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{a.title || "새 공지"}</p>
										{showPostDates ? (
											<p className="mt-1 text-[10px] font-medium text-white/75">{relativeTimeKo(a.created_at)}</p>
										) : null}
									</div>
									<ChevronRight className="h-5 w-5 shrink-0 text-white/90" strokeWidth={2.25} aria-hidden />
								</button>
							))
						: null}
				</div>
			</section>

			{!isLoading && unreadMaterials.length > 0 ? (
				<div className={`${STUDENT_APP_SHELL} pt-4`}>
					<section>
						<h2 className="mb-2 text-sm font-bold text-slate-800">새로 확인할 자료</h2>
						<ul className="space-y-2">
							{unreadMaterials.map((m) => (
								<li key={m.id}>
									<Link
										href={`/material/${m.id}`}
										className={`flex items-center gap-2.5 ${studentComicCard} p-2.5 transition hover:border-brand/20 hover:shadow-sm`}
									>
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
											<FileText className="h-4 w-4" strokeWidth={2} />
										</div>
										<div className="min-w-0 flex-1">
											<p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900">{m.title}</p>
											<div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
												<span className="font-medium text-brand/90">{m.category}</span>
												{showPostDates ? <span>{toKoreanDate(m.created_at)}</span> : null}
											</div>
										</div>
										<ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
									</Link>
								</li>
							))}
						</ul>
					</section>
				</div>
			) : null}

			<div className={`${STUDENT_APP_SHELL} space-y-5 pt-5`}>
				<div
					className={`${studentComicCard} p-2 sm:p-2.5`}
					onMouseLeave={() => setActiveVocabWord(null)}
				>
					<div className="flex items-start justify-between gap-2">
						<h2 className="text-sm font-bold leading-tight tracking-tight text-slate-900 sm:text-base">오늘의 어휘</h2>
						<button
							type="button"
							onClick={() => {
								setVocabShuffle((s) => s + 1);
								setActiveVocabWord(null);
							}}
							className="comic-border flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center rounded-lg bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"
							aria-label="다른 어휘 조합 보기"
						>
							<Shuffle className="h-3 w-3" strokeWidth={2.25} />
						</button>
					</div>

					<div
						className={`mt-2 grid gap-1.5 ${n <= 1 ? "grid-cols-1" : "grid-cols-2"}`}
						role="group"
						aria-label="오늘의 어휘 단어"
					>
						{vocabPair.map((v) => {
							const isActive = activeVocabWord === v.word;
							return (
								<button
									key={v.word}
									type="button"
									onMouseEnter={() => setActiveVocabWord(v.word)}
									onClick={() => setActiveVocabWord((cur) => (cur === v.word ? null : v.word))}
									aria-pressed={isActive}
									aria-describedby={isActive ? "vocab-meaning-panel" : undefined}
									className={`vocab-highlight-chip flex min-h-[2rem] touch-manipulation items-center justify-center rounded-xl px-1.5 py-1.5 text-center text-sm font-semibold text-slate-800 transition sm:min-h-[2.25rem] sm:text-base ${
										isActive ? "ring-1 ring-brand/35 ring-offset-1 ring-offset-white" : ""
									} `}
								>
									{v.word}
								</button>
							);
						})}
					</div>

					<div
						id="vocab-meaning-panel"
						className="mt-2 min-h-[2.5rem] rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-2 sm:min-h-[2.75rem] sm:px-2.5"
						role="region"
						aria-live="polite"
						aria-label="선택한 단어의 뜻"
					>
						{activeMeaning ? (
							<p className="vocab-meaning-text text-xs leading-relaxed sm:text-[13px]">{activeMeaning}</p>
						) : (
							<p className="text-center text-[10px] font-medium leading-relaxed text-slate-500 sm:text-left sm:text-xs">
								<span className="hidden sm:inline">단어에 마우스를 올리면 이곳에 뜻이 나타납니다.</span>
								<span className="sm:hidden">단어를 누르면 이곳에 뜻이 나타납니다.</span>
							</p>
						)}
					</div>
				</div>
			</div>

			{openAnnouncement ? (
				<div
					className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="announcement-dialog-title"
					onClick={() => setOpenAnnouncement(null)}
				>
					<div
						className={`${studentComicCard} flex max-h-[min(88dvh,28rem)] w-full max-w-lg flex-col overflow-hidden sm:max-h-[min(85vh,32rem)]`}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/90 bg-white px-4 py-3">
							<h3 id="announcement-dialog-title" className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-slate-800">
								{openAnnouncement.title || "공지"}
							</h3>
							<button
								type="button"
								onClick={() => setOpenAnnouncement(null)}
								className="comic-border flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100"
								aria-label="닫기"
							>
								<X className="h-4 w-4" strokeWidth={2.25} />
							</button>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
							<p className="vocab-meaning-text whitespace-pre-wrap text-[13px] sm:text-sm">
								{openAnnouncement.content?.trim() || "내용이 없습니다."}
							</p>
							{showPostDates ? (
								<p className="mt-4 text-xs font-medium tracking-tight text-slate-500">
									{relativeTimeKo(openAnnouncement.created_at)}
								</p>
							) : null}
						</div>
						<div className="shrink-0 border-t border-slate-200/90 bg-slate-50/80 p-3">
							<button
								type="button"
								onClick={() => setOpenAnnouncement(null)}
								className="w-full touch-manipulation rounded-xl bg-brand py-2.5 text-sm font-semibold tracking-tight text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:scale-[0.99]"
							>
								닫기
							</button>
						</div>
					</div>
				</div>
			) : null}

			<BottomTabNav active="home" />
		</main>
	);
}
