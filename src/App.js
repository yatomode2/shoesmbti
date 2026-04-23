import React from "react";
import YatoStyleCheckIn from "../mbti.jsx";

/* Vite는 .js 파일 안의 JSX를 변환하지 않으므로 createElement 사용 */
export default function App() {
  return React.createElement(YatoStyleCheckIn);
}
