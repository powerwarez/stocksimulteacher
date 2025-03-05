import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

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
  const [teacherInfo, setTeacherInfo] = useState({
    school: "",
    displayName: "",
    email: "",
  });
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    account: string;
    name: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

  // users가 변경될 때마다 sortedUsers 업데이트
  useEffect(() => {
    setSortedUsers(users);
  }, [users]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (teacherInfo.school) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("teacherInfo->>school", teacherInfo.school)
          .eq("teacherInfo->>displayName", teacherInfo.displayName)
          .eq("teacherInfo->>email", teacherInfo.email);

        if (error) {
          console.error("Error fetching users:", error.message);
        } else {
          console.log("Fetched users:", data);
          setUsers(data as User[]);
        }
      }
    };

    fetchUsers();
  }, [teacherInfo]);

  const handleSchoolSubmit = async () => {
    // Google 인증을 통해 얻은 사용자 정보를 가져옵니다.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setTeacherInfo({
        school,
        displayName: user.user_metadata.full_name || "",
        email: user.email || "",
      });
      console.log("Updated teacherInfo:", {
        school,
        displayName: user.user_metadata.full_name || "",
        email: user.email || "",
      });
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

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">학생 현황</h1>
      <div className="mb-6">
        <input
          type="text"
          placeholder="학교 이름을 입력하세요"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-4"
        />
        <button
          onClick={handleSchoolSubmit}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out"
        >
          불러오기
        </button>
      </div>
      {users.length > 0 && (
        <div className="mb-6">
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
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex flex-nowrap gap-4 pb-4">
          {sortedUsers.map((user) => {
            const portfolio = getPortfolio(user.data);
            return (
              <div
                key={user.account}
                className="flex-none w-80 bg-white shadow-md rounded-lg p-4"
              >
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
    </div>
  );
};

export default Students;
