import { useState } from 'react';
import { supabase } from '../supabaseClient';

const CreateStudent = () => {
  const [school, setSchool] = useState('');
  const [names, setNames] = useState('');
  const [teacherInfo, setTeacherInfo] = useState<{
    email: string;
    school: string;
    displayName: string;
  } | null>(null);

  // 교사 정보 설정
  const handleSchoolSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && school) {
      setTeacherInfo({
        school,
        displayName: user.user_metadata.full_name || '',
        email: user.email || '',
      });
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
    </div>
  );
};

export default CreateStudent;
