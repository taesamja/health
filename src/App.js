import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./App.css";

function QuizPage({ dataset, chapterList, currentChapter, setCurrentChapter }) {
  const pageSize = 10;
  const chapterProblems = dataset.filter(q => q.chapter === currentChapter);
  const totalPages = Math.ceil(chapterProblems.length / pageSize);
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState({});
  const [showComment, setShowComment] = useState({});
  const [searchValue, setSearchValue] = useState("");
  const [searchError, setSearchError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const navRef = useRef(null);
  const chapterButtonRefs = useRef({});

  const pageProblems = chapterProblems.slice((page - 1) * pageSize, page * pageSize);

  /* === 초기 로컬스토리지 복원 === */
  useEffect(() => {
    const savedAnswers = localStorage.getItem("quiz_answers");
    const savedShow = localStorage.getItem("quiz_showComment");
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    if (savedShow) setShowComment(JSON.parse(savedShow));
  }, []);

  /* === 저장 === */
  useEffect(() => {
    localStorage.setItem("quiz_answers", JSON.stringify(answers));
  }, [answers]);
  useEffect(() => {
    localStorage.setItem("quiz_showComment", JSON.stringify(showComment));
  }, [showComment]);

  /* === 현재 장 변경 시 1페이지로 === */
  useEffect(() => { setPage(1); }, [currentChapter]);

  /* === 제목줄 자동 스크롤 (가로 중앙) === */
  useLayoutEffect(() => {
    const btn = chapterButtonRefs.current[currentChapter];
    const nav = navRef.current;
    if (btn && nav) {
      const btnLeft = btn.offsetLeft;
      const btnWidth = btn.offsetWidth;
      const navWidth = nav.offsetWidth;
      const marginOffset = 100;
      const scrollTarget = btnLeft + btnWidth / 2 - navWidth / 2 - marginOffset;
      nav.scrollTo({ left: Math.max(scrollTarget, 0), behavior: "smooth" });
    }
  }, [currentChapter, page]);

  /* === 검색 자동완성 === */
  useEffect(() => {
    if (!searchValue) { setSuggestions([]); return; }
    const lower = searchValue.toLowerCase();
    const filtered = chapterList.filter(
      c => String(c.chapter).includes(lower) || c.chapter_title.toLowerCase().includes(lower)
    );
    setSuggestions(filtered.slice(0, 6));
  }, [searchValue, chapterList]);

  /* === 검색 기능 === */
  const handleSearch = (target) => {
    const trimmed = (target || searchValue).trim();
    if (!trimmed) return;
    let foundChapter = null;
    if (!isNaN(trimmed)) {
      foundChapter = chapterList.find(c => String(c.chapter) === String(parseInt(trimmed, 10)));
    } else {
      foundChapter = chapterList.find(c =>
        c.chapter_title.toLowerCase().includes(trimmed.toLowerCase())
      );
    }
    if (foundChapter) {
      setCurrentChapter(foundChapter.chapter);
      setPage(1);
      setSearchError("");
      setSuggestions([]);
    } else {
      setSearchError("해당 장을 찾을 수 없습니다.");
    }
  };

  /* === 선택/해설/초기화 === */
  const selectAnswer = (q, idx) => {
    const key = `${q.chapter}_${q.number}`;
    setAnswers(prev => ({ ...prev, [key]: idx }));
  };
  const toggleComment = (q) => {
    const key = `${q.chapter}_${q.number}`;
    setShowComment(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const resetProblem = (q) => {
    const key = `${q.chapter}_${q.number}`;
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[key];
      localStorage.setItem("quiz_answers", JSON.stringify(copy));
      return copy;
    });
    setShowComment(prev => {
      const copy = { ...prev };
      delete copy[key];
      localStorage.setItem("quiz_showComment", JSON.stringify(copy));
      return copy;
    });
  };
  const resetAll = () => {
    setAnswers({});
    setShowComment({});
    localStorage.removeItem("quiz_answers");
    localStorage.removeItem("quiz_showComment");
  };

  /* === 현재 장 점수/정답률 === */
  const currentAnswered = chapterProblems.filter(q => answers[`${q.chapter}_${q.number}`] !== undefined);
  const currentCorrect = currentAnswered.filter(q => {
    const ansIndex = "①②③④".includes(q.answer)
      ? "①②③④".indexOf(q.answer)
      : parseInt(q.answer, 10) - 1;
    return answers[`${q.chapter}_${q.number}`] === ansIndex;
  });
  const currentRate = chapterProblems.length > 0
    ? Math.round((currentCorrect.length / chapterProblems.length) * 100)
    : 0;

  /* 페이지 이동 */
  const handlePrev = () => {
    if (page > 1) setPage(p => p - 1);
    else {
      const prevIdx = chapterList.findIndex(c => c.chapter === currentChapter) - 1;
      if (prevIdx >= 0) {
        const prevChap = chapterList[prevIdx].chapter;
        setCurrentChapter(prevChap);
        const prevCount = dataset.filter(q => q.chapter === prevChap).length;
        setPage(Math.ceil(prevCount / pageSize));
      }
    }
  };
  const handleNext = () => {
    if (page < totalPages) setPage(p => p + 1);
    else {
      const nextIdx = chapterList.findIndex(c => c.chapter === currentChapter) + 1;
      if (nextIdx < chapterList.length) {
        setCurrentChapter(chapterList[nextIdx].chapter);
        setPage(1);
      }
    }
  };

  return (
    <div className="quiz-container">

      {/* 전체 리셋 버튼 */}
      <div className="score-summary">
        <button className="reset-btn big" onClick={resetAll}>전체 초기화</button>
      </div>

      {/* 검색 UI */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="장 번호나 제목 입력"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map(s => (
                <li key={s.chapter} onClick={() => {
                  setSearchValue(s.chapter_title);
                  handleSearch(s.chapter_title);
                }}>
                  {s.chapter < 10 ? `0${s.chapter}` : s.chapter} {s.chapter_title}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={() => handleSearch()}>검색</button>
      </div>
      {searchError && <div className="search-error">{searchError}</div>}

      {/* 제목 + 정답률 */}
      <h2>
        {chapterList.find(c => c.chapter === currentChapter)?.chapter_title}
        <span style={{ fontSize: '16px', color: "#666", marginLeft: 16 }}>
          ({chapterProblems.length}문제, {page}/{totalPages}페이지) |
          <b style={{ color: "#347A1A" }}>
            {" "}정답률: {currentRate}% ({currentCorrect.length}/{chapterProblems.length})
          </b>
        </span>
      </h2>

      {/* 장 네비게이션 (가로) */}
      <div className="chapter-nav" ref={navRef}>
        {chapterList.map(chap => (
          <button
            key={chap.chapter}
            ref={el => (chapterButtonRefs.current[chap.chapter] = el)}
            onClick={() => setCurrentChapter(chap.chapter)}
            className={currentChapter === chap.chapter ? "active" : ""}
          >
            {chap.chapter < 10 ? `0${chap.chapter}` : chap.chapter} {chap.chapter_title}
          </button>
        ))}
      </div>

      {/* 문제 목록 */}
      {pageProblems.map(q => {
        const key = `${q.chapter}_${q.number}`;
        const ansIndex = "①②③④".includes(q.answer)
          ? "①②③④".indexOf(q.answer)
          : parseInt(q.answer, 10) - 1;
        return (
          <div className="question-block" key={key}>
            <div className="question-title">{q.number}. {q.question}</div>
            <ul>
              {q.options.map((opt, idx) => {
                const selected = answers[key] === idx;
                const isCorrect = idx === ansIndex;
                let mark = "";
                if (selected) mark = isCorrect ? "○" : "✖";
                return (
                  <li key={idx}>
                    <label className="option">
                      <input
                        type="radio"
                        name={`q${q.chapter}_${q.number}`}
                        checked={selected}
                        onChange={() => selectAnswer(q, idx)}
                      />
                      {["①", "②", "③", "④"][idx]} {opt}
                      <span className={isCorrect && selected ? "mark correct-mark" :
                        !isCorrect && selected ? "mark wrong-mark" : ""}>
                        {mark}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="btn-row">
              <button type="button" onClick={() => toggleComment(q)}>
                {showComment[key] ? "해설 숨기기" : "해설 보기"}
              </button>
              <button type="button" className="reset-btn" onClick={() => resetProblem(q)}>
                초기화
              </button>
            </div>
            {showComment[key] && (
              <div className="comment show">
                <b>정답: {q.answer} — {q.options[ansIndex]}</b>
                <pre>{q.commentary}</pre>
              </div>
            )}
          </div>
        );
      })}

      {/* 페이지네이션 */}
      <div className="pagination">
        <button onClick={handlePrev}
          disabled={currentChapter === chapterList[0].chapter && page === 1}>
          이전
        </button>
        <button onClick={handleNext}
          disabled={currentChapter === chapterList.at(-1).chapter && page === totalPages}>
          다음
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [chapterList, setChapterList] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(1);

  useEffect(() => {
    fetch("problems_with_chapters.json")
      .then(res => res.json())
      .then(problems => {
        setData(problems);
        const chapters = Array.from(
          new Map(problems.map(q => [q.chapter, { chapter: q.chapter, chapter_title: q.chapter_title }])).values()
        );
        setChapterList(chapters);
        setCurrentChapter(chapters[0]?.chapter || 1);
      });
  }, []);

  if (!data.length) return <div className="loading">문제를 불러오는 중입니다...</div>;

  return (
    <QuizPage
      dataset={data}
      chapterList={chapterList}
      currentChapter={currentChapter}
      setCurrentChapter={setCurrentChapter}
    />
  );
}