import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Stock {
  quantity: number;
  purchase_price: number;
  current_price: number;
}

interface Portfolio {
  cash: number;
  stocks: Record<string, Stock>;
}

interface UserData {
  day_count: number;
  portfolio: Portfolio;
  stocks: {
    [sector: string]: {
      [stockName: string]: {
        current_price: number;
      };
    };
  };
}

interface User {
  id: string;
  teacherInfo: {
    school: string;
    displayName: string;
    email: string;
  };
  account: string;
  name: string;
  pw: string;
  data: UserData | string | null;
}

// 모달 컴포넌트를 분리
interface PasswordModalProps {
  isOpen: boolean;
  selectedUser: { id: string; account: string; name: string } | null;
  onClose: () => void;
  onUpdate: (newPassword: string) => void;
}

const PasswordModal = ({
  isOpen,
  selectedUser,
  onClose,
  onUpdate,
}: PasswordModalProps) => {
  const [newPassword, setNewPassword] = useState("");

  if (!isOpen || !selectedUser) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()} // 이벤트 버블링 방지
      >
        <h2 className="text-xl font-bold mb-4">비밀번호 변경</h2>
        <p className="text-gray-600 mb-4">
          {selectedUser.name} ({selectedUser.account}) 학생의 비밀번호를
          변경합니다.
        </p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="새 비밀번호"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          autoFocus // 자동으로 포커스
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => {
              onUpdate(newPassword);
              setNewPassword("");
            }}
            className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg"
          >
            변경
          </button>
        </div>
      </div>
    </div>
  );
};

const Students: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortedUsers, setSortedUsers] = useState<User[]>([]);
  const [school, setSchool] = useState("");
  const [teacherInfo, setTeacherInfo] = useState<{
    school: string;
    displayName: string;
    email: string;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    account: string;
    name: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  // 로딩 상태 추가
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // users가 변경될 때마다 sortedUsers 업데이트
  useEffect(() => {
    setSortedUsers([...users]);
  }, [users]);

  // 컴포넌트 마운트 시 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("인증 확인 오류:", error);
          setError("로그인 상태를 확인하는데 문제가 발생했습니다.");
        } else if (user) {
          console.log("로그인된 사용자:", user);
        } else {
          console.log("로그인되지 않은 상태");
        }
      } catch (err) {
        console.error("인증 확인 중 예외 발생:", err);
        setError("로그인 상태를 확인하는데 문제가 발생했습니다.");
      } finally {
        // 초기 로딩 상태 해제
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    checkAuth();
  }, []);

  useEffect(() => {
    // 로그인한 사용자의 마지막으로 입력한 학교 정보 가져오기
    const fetchLastInputSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.id) {
          // schoolinfo 테이블에서 마지막으로 입력한 학교 정보 조회
          const { data, error } = await supabase
            .from('schoolinfo')
            .select('lastinputschool')
            .eq('teacherID', user.id)
            .single();
          
          if (error) {
            console.error('마지막 입력 학교 정보 조회 실패:', error);
            return;
          }
          
          if (data && data.lastinputschool) {
            setSchool(data.lastinputschool);
          }
        }
      } catch (err) {
        console.error('학교 정보 조회 중 오류 발생:', err);
      }
    };

    fetchLastInputSchool();
  }, []);

  const handleSchoolSubmit = async () => {
    console.log("handleSchoolSubmit 함수 호출됨");
    console.log("현재 입력된 학교:", school);
    
    // 로딩 상태 설정 및 오류 초기화
    setIsLoading(true);
    setError(null);
    
    try {
      // Google 인증을 통해 얻은 사용자 정보를 가져옵니다.
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        setError("사용자 정보를 가져오는데 실패했습니다.");
        return;
      }

      console.log("인증된 사용자 정보:", user);
      
      if (!user) {
        console.error("사용자 정보가 없습니다.");
        setError("로그인이 필요합니다.");
        return;
      }

      const displayName = user.user_metadata.full_name || "";
      const email = user.email || "";
      
      console.log("검색에 사용할 정보:", {
        school,
        displayName,
        email
      });

      const newTeacherInfo = {
        school,
        displayName,
        email,
      };

      console.log("새로운 teacherInfo:", newTeacherInfo);
      setTeacherInfo(newTeacherInfo);

      // 학교 정보를 schoolinfo 테이블에 업데이트
      if (user.id) {
        try {
          // 기존 정보 조회
          const { data: existingSchool, error: fetchError } = await supabase
            .from('schoolinfo')
            .select('*')
            .eq('teacherID', user.id)
            .single();
            
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('학교 정보 조회 실패:', fetchError);
          }
          
          // 데이터가 있으면 업데이트, 없으면 새로 생성
          if (existingSchool) {
            const { error: updateError } = await supabase
              .from('schoolinfo')
              .update({ lastinputschool: school })
              .eq('teacherID', user.id);
            
            if (updateError) {
              console.error('학교 정보 업데이트 실패:', updateError);
            }
          } else {
            const { error: insertError } = await supabase
              .from('schoolinfo')
              .insert([{ teacherID: user.id, lastinputschool: school }]);
            
            if (insertError) {
              console.error('학교 정보 저장 실패:', insertError);
            }
          }
        } catch (err) {
          console.error('학교 정보 저장 중 오류 발생:', err);
        }
      }

      // 모든 조건 사용
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("teacherInfo->>school", school)
        .eq("teacherInfo->>displayName", displayName)
        .eq("teacherInfo->>email", email);

      if (fetchError) {
        console.error("학생 데이터 가져오기 실패:", fetchError);
        setError("학생 정보를 가져오는데 실패했습니다.");
        return;
      }

      console.log("가져온 학생 데이터:", userData);
      
      if (userData && userData.length > 0) {
        setUsers(userData as User[]);
        setSortedUsers(userData as User[]);
        console.log("학생 데이터 설정 완료:", userData.length, "명의 학생 정보가 로드되었습니다.");
      } else {
        console.log("해당 조건의 학생 정보가 없습니다.");
        
        // 학교 이름만으로 검색해보기
        const { data: schoolOnlyData } = await supabase
          .from("users")
          .select("*")
          .eq("teacherInfo->>school", school);
          
        console.log("학교 이름만으로 검색한 결과:", schoolOnlyData);
        
        if (schoolOnlyData && schoolOnlyData.length > 0) {
          console.log("학교는 일치하지만 교사 정보가 일치하지 않는 데이터가 있습니다.");
          setError("해당 학교에 학생 정보가 있지만, 교사 정보가 일치하지 않습니다.");
        } else {
          setError("해당 조건의 학생 정보가 없습니다.");
        }
      }

    } catch (error) {
      console.error("handleSchoolSubmit 에러:", error);
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      // 로딩 상태 해제
      setIsLoading(false);
    }
  };

  // data 필드가 문자열일 경우 JSON 파싱을 해줍니다.
  const getPortfolio = (data: User["data"]): Portfolio | null => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data) as UserData;
        return parsed.portfolio;
      } catch (error) {
        console.error("JSON 파싱 에러:", error);
        return null;
      }
    }
    return data.portfolio;
  };

  // 현재 가격을 찾는 함수 수정
  const findCurrentPrice = (
    stockName: string,
    userData: UserData | string | null
  ): number | undefined => {
    if (!userData) return undefined;
    try {
      let parsedData: UserData;
      if (typeof userData === "string") {
        parsedData = JSON.parse(userData);
      } else {
        parsedData = userData;
      }

      const stocksData = parsedData.stocks;
      for (const [, sectorData] of Object.entries(stocksData)) {
        const typedSectorData = sectorData as {
          [key: string]: { current_price: number };
        };
        if (typedSectorData[stockName]) {
          return typedSectorData[stockName].current_price;
        }
      }
    } catch (error) {
      console.error("Error finding current price:", error);
    }
    return undefined;
  };

  // 수익률 계산 함수
  const calculateReturn = (
    purchasePrice: number,
    currentPrice: number
  ): number => {
    return ((currentPrice - purchasePrice) / purchasePrice) * 100;
  };

  // 수익률 표시 색상 결정 함수
  const getReturnColor = (returnRate: number): string => {
    if (returnRate > 0) return "text-red-500";
    if (returnRate < 0) return "text-blue-500";
    return "text-gray-600";
  };

  // 총 자산 가치와 수익률을 계산하는 함수 추가
  const calculateTotalReturn = (
    portfolio: Portfolio,
    userData: User["data"]
  ): { totalValue: number; totalReturn: number } => {
    try {
      let totalCurrentValue = portfolio.cash;
      let totalInvestment = portfolio.cash;

      // 각 보유 주식의 현재 가치와 투자 금액 계산
      Object.entries(portfolio.stocks || {}).forEach(([stockName, stock]) => {
        const currentPrice = findCurrentPrice(stockName, userData);
        if (currentPrice) {
          // 현재 가치 = 현재 주가 * 보유 수량
          totalCurrentValue += currentPrice * stock.quantity;
          // 투자 금액 = 매수 가격 * 보유 수량
          totalInvestment += stock.purchase_price * stock.quantity;
        }
      });

      // 전체 수익률 계산
      const totalReturn =
        ((totalCurrentValue - totalInvestment) / totalInvestment) * 100;

      return {
        totalValue: totalCurrentValue,
        totalReturn: totalReturn,
      };
    } catch (error) {
      console.error("Error calculating total return:", error);
      return {
        totalValue: portfolio.cash,
        totalReturn: 0,
      };
    }
  };

  // 정렬 함수들
  const sortByTotalAsset = () => {
    const sorted = [...sortedUsers].sort((a, b) => {
      const portfolioA = getPortfolio(a.data);
      const portfolioB = getPortfolio(b.data);
      if (!portfolioA || !portfolioB) return 0;

      const { totalValue: valueA } = calculateTotalReturn(portfolioA, a.data);
      const { totalValue: valueB } = calculateTotalReturn(portfolioB, b.data);

      return valueB - valueA; // 내림차순
    });
    setSortedUsers(sorted);
  };

  const sortByEvaluation = () => {
    const sorted = [...sortedUsers].sort((a, b) => {
      const portfolioA = getPortfolio(a.data);
      const portfolioB = getPortfolio(b.data);
      if (!portfolioA || !portfolioB) return 0;

      const { totalReturn: returnA } = calculateTotalReturn(portfolioA, a.data);
      const { totalReturn: returnB } = calculateTotalReturn(portfolioB, b.data);

      return returnB - returnA; // 내림차순
    });
    setSortedUsers(sorted);
  };

  const sortByCash = () => {
    const sorted = [...sortedUsers].sort((a, b) => {
      const portfolioA = getPortfolio(a.data);
      const portfolioB = getPortfolio(b.data);
      if (!portfolioA || !portfolioB) return 0;

      return portfolioB.cash - portfolioA.cash; // 내림차순
    });
    setSortedUsers(sorted);
  };

  const sortByStockCount = () => {
    const sorted = [...sortedUsers].sort((a, b) => {
      const portfolioA = getPortfolio(a.data);
      const portfolioB = getPortfolio(b.data);
      if (!portfolioA || !portfolioB) return 0;

      const countA = Object.keys(portfolioA.stocks || {}).length;
      const countB = Object.keys(portfolioB.stocks || {}).length;

      return countB - countA; // 내림차순
    });
    setSortedUsers(sorted);
  };

  const sortByName = () => {
    const sorted = [...sortedUsers].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    setSortedUsers(sorted);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;

    try {
      // 렌더링을 위해 임시로 보이게 만들기
      pdfRef.current.style.display = 'block';
      pdfRef.current.style.position = 'fixed';
      pdfRef.current.style.top = '0';
      pdfRef.current.style.left = '0';
      pdfRef.current.style.zIndex = '-9999';
      pdfRef.current.style.width = '1024px'; // 고정 너비 설정
      pdfRef.current.style.background = 'white';
      
      // 약간의 지연을 주어 DOM이 업데이트될 시간을 줌
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // PDF 생성 후 다시 숨기기
      pdfRef.current.style.display = 'none';
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 1.0); // JPEG 형식으로 변경
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `${teacherInfo?.school || '학교'}_${teacherInfo?.displayName || '교사'}_학생명렬표.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF 생성 중 오류 발생:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    }
  };

  // 비밀번호 수정 함수
  const handlePasswordUpdate = async (newPassword: string) => {
    if (!selectedUser || !newPassword) return;

    try {
      // Supabase users 테이블의 pw 필드를 업데이트
      const { error } = await supabase
        .from("users")
        .update({ pw: newPassword })
        .eq("account", selectedUser.account);

      if (error) throw error;

      // 로컬 상태도 업데이트
      setUsers(
        users.map((user) =>
          user.account === selectedUser.account
            ? { ...user, pw: newPassword }
            : user
        )
      );

      alert("비밀번호가 성공적으로 변경되었습니다.");
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating password:", error);
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    }
  };

  // 학생 삭제 함수
  const handleDeleteUser = async (account: string) => {
    try {
      // account를 기준으로 사용자 삭제
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("account", account);

      if (deleteError) {
        throw deleteError;
      }

      // 삭제 후 사용자 목록 업데이트
      setUsers(users.filter((user) => user.account !== account));
      setSortedUsers(sortedUsers.filter((user) => user.account !== account));
      alert("학생이 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("학생 삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUserToDelete(null); // 모달 닫기
    }
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">학생 현황</h1>
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          아래에 학생 생성 시 쓰셨던 학교 이름을 입력하시면 학생 정보를 불러올 수 있습니다.
        </p>
      </div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="학교 이름을 입력하세요"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-4"
          disabled={isLoading}
        />
        <button
          onClick={handleSchoolSubmit}
          className={`${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out`}
          disabled={isLoading}
        >
          {isLoading ? "로딩 중..." : "불러오기"}
        </button>
      </div>

      {/* 오류 메시지 표시 */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 로딩 중 표시 */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">로딩 중...</span>
        </div>
      )}

      {/* 학생 데이터가 있을 때만 정렬 버튼과 학생 카드 표시 */}
      {!isLoading && users.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600">학생 현황을 내려받아 학생 로그인 정보를 출력할 때 사용하세요.</p>
          <button
          onClick={handleDownloadPdf}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out ml-4"
          disabled={isLoading || users.length === 0}
        >
          학생 현황 다운
        </button>
        <br/>
          <p className="text-lg font-semibold mb-2">정렬</p>
          <div className="flex gap-2">
            <button
              onClick={sortByTotalAsset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-150 ease-in-out"
            >
              총자산 순
            </button>
            <button
              onClick={sortByEvaluation}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-150 ease-in-out"
            >
              평가금 순
            </button>
            <button
              onClick={sortByCash}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-150 ease-in-out"
            >
              현금 순
            </button>
            <button
              onClick={sortByStockCount}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-150 ease-in-out"
            >
              보유종목 수량순
            </button>
            <button
              onClick={sortByName}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition duration-150 ease-in-out"
            >
              학생명 가나다순
            </button>
          </div>
        </div>
      )}
      <div>
        <div className="flex flex-wrap gap-4 pb-4">
          {sortedUsers.map((user) => {
            const portfolio = getPortfolio(user.data);
            return (
              <div
                key={user.account}
                className="w-80 bg-white shadow-md rounded-lg p-4 mb-4 relative"
              >
                <button
                  onClick={() => setUserToDelete(user.account)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
                  title="학생 삭제"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <h2 className="text-lg font-bold mb-2">{user.name}</h2>
                <p className="text-sm text-gray-600">계정: {user.account}</p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  비밀번호:{" "}
                  {showPasswordFor === user.account ? user.pw : "••••••"}
                  <button
                    onClick={() =>
                      setShowPasswordFor(
                        showPasswordFor === user.account ? null : user.account
                      )
                    }
                    className="text-blue-500 hover:text-blue-600 text-xs"
                  >
                    {showPasswordFor === user.account ? "숨기기" : "보기"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser({
                        id: user.id,
                        account: user.account,
                        name: user.name,
                      });
                      setIsModalOpen(true);
                    }}
                    className="text-gray-500 hover:text-gray-600 text-xs"
                  >
                    수정
                  </button>
                </p>
                {portfolio ? (
                  <>
                    <div className="border-b border-gray-200 pb-2 mb-2">
                      {/* 현금과 전체 수익률 표시 */}
                      {(() => {
                        const { totalValue, totalReturn } =
                          calculateTotalReturn(portfolio, user.data);
                        const returnColor = getReturnColor(totalReturn);
                        return (
                          <>
                            <p className="text-sm text-gray-600">
                              현금: {portfolio.cash.toLocaleString()}원
                            </p>
                            <p className="text-sm text-gray-600">
                              총 자산: {totalValue.toLocaleString()}원
                              <span className={`ml-2 ${returnColor}`}>
                                ({totalReturn.toFixed(2)}%)
                              </span>
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-2">
                      <h3 className="text-md font-semibold">주식 포트폴리오</h3>
                      <ul className="list-disc pl-5">
                        {Object.entries(portfolio.stocks || {}).map(
                          ([stockName, stock]) => {
                            const currentPrice = findCurrentPrice(
                              stockName,
                              user.data
                            );
                            const returnRate = currentPrice
                              ? calculateReturn(
                                  stock.purchase_price,
                                  currentPrice
                                )
                              : 0;
                            const returnColor = getReturnColor(returnRate);

                            return (
                              <li
                                key={stockName}
                                className="text-sm text-gray-600"
                              >
                                {stockName}: {stock.quantity}주,{" "}
                                {stock.purchase_price.toLocaleString()}원
                                {currentPrice && (
                                  <span className={returnColor}>
                                    ({returnRate.toFixed(2)}%)
                                  </span>
                                )}
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">포트폴리오 정보 없음</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <PasswordModal
        isOpen={isModalOpen}
        selectedUser={selectedUser}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdate={handlePasswordUpdate}
      />

      {/* 삭제 확인 모달 */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">학생 삭제 확인</h3>
            <p className="mb-6">
              학생의 자료가 모두 지워지고 복구할 수 없습니다.
            </p>
            <p className="mb-6">정말 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  handleDeleteUser(userToDelete);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add hidden PDF template */}
      <div ref={pdfRef} className="hidden">
        <div className="bg-white p-8" style={{ width: '1024px' }}>
          <h1 className="text-3xl font-bold mb-8 text-center">
            {teacherInfo?.school || '학교'} 학생 명렬표
          </h1>
          <p className="text-right mb-8">
            담당교사: {teacherInfo?.displayName || '교사'}
          </p>
          <div className="space-y-6">
            {sortedUsers.map((user, index) => (
              <div key={user.account} className="border-b pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">학생 {index + 1}</p>
                    <p className="text-gray-700">이름: {user.name}</p>
                    <p className="text-gray-700">계정: {user.account}</p>
                    <p className="text-gray-700">비밀번호: {user.pw}</p>
                  </div>
                  <div>
                    {user.data && (
                      <>
                        <p className="text-gray-700">
                          현금: {typeof user.data === 'string' 
                            ? JSON.parse(user.data).portfolio.cash.toLocaleString() 
                            : user.data.portfolio.cash.toLocaleString()}원
                        </p>
                        <p className="text-gray-700">
                          보유 주식 수: {typeof user.data === 'string'
                            ? Object.keys(JSON.parse(user.data).portfolio.stocks || {}).length
                            : Object.keys(user.data.portfolio.stocks || {}).length}개
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-right text-sm text-gray-500">
            출력일: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;
