import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient"; // supabaseClient.tsx에서 가져옵니다.

function Login() {
  const navigate = useNavigate();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const toggleGuide = () => {
    setIsGuideOpen(!isGuideOpen);
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };

    checkSession();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/",
      },
    });
    if (error) console.error("Error logging in with Google:", error.message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          주식 시뮬레이션 교사용 관리 페이지
        </h1>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-8">
          <p className="text-yellow-700 font-medium">
            ⚠️ 본 사이트는 교사용입니다. 학생들에게 노출되지 않도록 해주세요.
          </p>
        </div>

        <div className="mb-8">
          <button
            onClick={toggleGuide}
            className="w-full flex justify-between items-center bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition duration-150 ease-in-out"
          >
            <span className="text-lg font-medium text-blue-800">
              학생 활용방법 안내
            </span>
            <span className="text-blue-800 text-xl">
              {isGuideOpen ? "▲" : "▼"}
            </span>
          </button>

          {isGuideOpen && (
            <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-2">1단계: 뉴스 생성하기</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  왼쪽 '오늘의 뉴스' 영역에서 '뉴스 생성' 버튼을 클릭하세요.
                </li>
                <li>AI가 주식 시장 뉴스를 5개 만들어줍니다.</li>
              </ul>

              <h3 className="font-bold text-lg mb-2">
                2단계: 뉴스 읽고 예측하기
              </h3>
              <ul className="list-disc pl-6 mb-4">
                <li>'오늘의 뉴스' 아래 뉴스들을 꼼꼼히 읽어보세요.</li>
                <li>
                  각 뉴스를 읽고 '🤔 어떤 회사가 이 뉴스 때문에 돈을 더 많이 벌
                  수 있을까?' 또는 '😥 손해를 볼 회사는 어디일까?' 생각해
                  보세요.
                </li>
                <li>
                  초등학생 눈높이에서 쉽고 재미있게, 미래를 예측하는 연습을 할
                  수 있습니다.
                </li>
              </ul>

              <h3 className="font-bold text-lg mb-2">
                3단계: 주가 및 기업 정보 확인하기
              </h3>
              <ul className="list-disc pl-6 mb-4">
                <li>메뉴에서 '📈 현재 주가' 탭을 선택하세요.</li>
                <li>
                  현재 여러분이 가진 주식과 현금 잔고, 총 평가액, 수익률 등을
                  한눈에 볼 수 있습니다.
                </li>
                <li>
                  투자 결과가 어떤지, 얼마나 이익/손해를 봤는지 확인해보세요.
                </li>
              </ul>

              <h3 className="font-bold text-lg mb-2">4단계: 주식 매수하기</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>메뉴에서 '💰 주식 매수' 탭을 선택하세요.</li>
                <li>'매수 종목 선택' 메뉴에서 원하는 회사를 고르세요.</li>
                <li>
                  '매수 수량'을 입력하고 '주식 매수' 버튼을 클릭하면, 주식을 살
                  수 있습니다.
                </li>
                <li>팁: 여러분의 뉴스 예측을 바탕으로 주식을 골라보세요!</li>
              </ul>

              <h3 className="font-bold text-lg mb-2">
                5단계: 포트폴리오 확인하기
              </h3>
              <ul className="list-disc pl-6 mb-4">
                <li>메뉴에서 '📊 내 포트폴리오' 탭을 선택하세요.</li>
                <li>
                  현재 여러분이 가진 주식과 현금 잔고, 총 평가액, 수익률 등을
                  한눈에 볼 수 있습니다.
                </li>
                <li>
                  투자 결과가 어떤지, 얼마나 이익/손해를 봤는지 확인해보세요.
                </li>
              </ul>

              <h3 className="font-bold text-lg mb-2">6단계: 주식 매도하기</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>메뉴에서 '📉 주식 매도' 탭을 선택하세요.</li>
                <li>'매도 종목 선택' 메뉴에서 팔고 싶은 주식을 고르세요.</li>
                <li>
                  '매도 수량'을 입력하고 '주식 매도' 버튼을 클릭하면, 주식을
                  팔고 현금을 얻을 수 있습니다.
                </li>
                <li>팁: 주가가 올랐을 때 팔아서 이익을 남겨보세요!</li>
              </ul>

              <h3 className="font-bold text-lg mb-2">
                7단계: 하루 지나기 & 이전 뉴스 의미 해설 보기
              </h3>
              <ul className="list-disc pl-6 mb-4">
                <li>사이드바 메뉴의 '하루 지나기' 버튼을 클릭하세요.</li>
                <li>주가가 변동되고, 새로운 하루가 시작됩니다.</li>
                <li>
                  '어제 뉴스 해설' 탭에서 각 뉴스의 '뉴스 의미' 해설이 추가된
                  것을 확인해보세요.
                </li>
                <li>
                  AI가 이전 뉴스 (어제 뉴스)의 핵심 의미를 초등학생 눈높이에
                  맞춰 쉽게 설명해줍니다.
                </li>
              </ul>

              <h3 className="font-bold text-lg mb-2">
                계속해서 배우고 성장하기! 🌱
              </h3>
              <ul className="list-disc pl-6 mb-4">
                <li>
                  모의 주식 거래 앱을 꾸준히 사용하면서, 뉴스-주가 관계를 배우고
                  투자 감각을 키워보세요.
                </li>
                <li>
                  처음에는 어렵더라도, 계속 연습하면 주식 투자가 더 재미있고
                  쉬워질 거예요! 😉
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGoogleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            Google 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
