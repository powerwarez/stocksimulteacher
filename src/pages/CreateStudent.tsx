import { useState } from 'react';
import { supabase } from '../supabaseClient';

// 경고 모달 컴포넌트 추가
interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const WarningModal: React.FC<WarningModalProps> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">입력 오류</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateStudent = () => {
  const [school, setSchool] = useState('');
  const [names, setNames] = useState('');
  const [teacherInfo, setTeacherInfo] = useState<{
    email: string;
    school: string;
    displayName: string;
  } | null>(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // 교사 정보 설정
  const handleSchoolSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && school) {
      setTeacherInfo({
        school,
        displayName: user.user_metadata.full_name || '',
        email: user.email || '',
      });

      // 마지막으로 입력한 학교 정보를 schoolinfo 테이블에 저장
      try {
        if (!user.id) {
          console.error('사용자 ID를 찾을 수 없습니다.');
          return;
        }
        
        // schoolinfo 테이블에서 해당 사용자의 정보 조회
        const { data: existingSchool, error: fetchError } = await supabase
          .from('schoolinfo')
          .select('*')
          .eq('teacherID', user.id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116는 데이터가 없는 경우
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
  };

  // 랜덤 계정 생성 (중복 체크 포함)
  const generateUniqueAccount = async (name: string): Promise<string> => {
    while (true) {
      const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999 사이의 랜덤 숫자
      const account = `${name}${randomNum}`;
      
      // 중복 체크
      const { data } = await supabase
        .from('users')
        .select('account')
        .eq('account', account);
      
      if (!data || data.length === 0) {
        return account;
      }
    }
  };

  // 한글 이름 검증 함수 추가
  const isValidKoreanName = (name: string) => {
    const koreanNameRegex = /^[0-9\s]*[가-힣]{2,}$/;
    return koreanNameRegex.test(name);
  };

  // 학생 생성
  const handleCreateStudents = async () => {
    if (!teacherInfo) {
      alert('먼저 학교 정보를 입력하고 확인해주세요.');
      return;
    }

    const studentNames = names.split('\n').filter(name => name.trim());
    if (studentNames.length === 0) {
      alert('학생 이름을 입력해주세요.');
      return;
    }

    // 이름 유효성 검사
    const invalidNames = studentNames.filter(name => !isValidKoreanName(name.trim()));
    if (invalidNames.length > 0) {
      setWarningMessage("학생 이름은 한글로 2자 이상 입력해주세요.");
      setIsWarningModalOpen(true);
      return;
    }

    try {
      for (const name of studentNames) {
        const account = await generateUniqueAccount(name.trim());
        const { error } = await supabase
          .from('users')
          .insert([
            {
              account,
              name: name.trim(),
              pw: Math.floor(1000 + Math.random() * 9000).toString(),
              teacherInfo,
            }
          ]);

        if (error) throw error;
      }
      
      alert('학생이 성공적으로 생성되었습니다.');
      setNames('');
    } catch (error) {
      console.error('Error creating students:', error);
      alert('학생 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">학생 생성</h1>
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          아래에 학교 이름을 입력하시면 학생 계정을 생성할 수 있습니다.
        </p>
      </div>
      {/* 학교 정보 입력 섹션 */}
      <div className="mb-8 max-w-md">
        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학교
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(단계1)선생님의 학교 이름을 입력하세요"
              disabled={!!teacherInfo}
            />
          </div>
          <button
            onClick={handleSchoolSubmit}
            disabled={!!teacherInfo}
            className={`px-6 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out ${
              teacherInfo 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            확인
          </button>
        </div>

        {/* 현재 교사 정보 표시 */}
        {teacherInfo && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="font-semibold mb-2">현재 교사 정보:</h2>
            <p className="text-sm text-gray-600">학교: {teacherInfo.school}</p>
            <p className="text-sm text-gray-600">이름: {teacherInfo.displayName}</p>
            <p className="text-sm text-gray-600">이메일: {teacherInfo.email}</p>
          </div>
        )}
      </div>

      {/* 학생 이름 입력 섹션 */}
      {teacherInfo && (
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            학생 이름 (엔터로 구분)
          </label>
          <p className="text-sm text-red-600 mb-2">
            tip! 학생 이름 앞에 번호를 붙이면 학생 번호 순서대로 정렬할 수 있습니다.
          </p>
          <textarea
            value={names}
            onChange={(e) => setNames(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            placeholder="학생 이름을 입력하세요 (엔터로 구분)"
            rows={5}
          />
          <button
            onClick={handleCreateStudents}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition duration-150 ease-in-out"
          >
            학생 생성
          </button>
        </div>
      )}

      {/* 경고 모달 추가 */}
      <WarningModal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        message={warningMessage}
      />
    </div>
  );
};

export default CreateStudent;
