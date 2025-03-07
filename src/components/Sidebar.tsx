import { Link} from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Sidebar = () => {


  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      alert('로그아웃 되었습니다. 가이랩은 선생님의 열정을 응원합니다.');
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-64 flex-shrink-0 min-h-screen bg-gray-800 text-white p-4">
      <h1 className="text-3xl font-bold mb-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">초등학생을</h1>
      <h1 className="text-3xl font-bold mb-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">위한</h1>
      <h1 className="text-3xl font-bold mb-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">모의주식</h1>
      <h1 className="text-3xl font-bold mb-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">(교사용)</h1>
      <div className="mt-8">
        <nav>
          <ul className="space-y-2">
            <li>
              <Link 
                to="/students" 
                className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors text-2xl"
              >
                학생 현황
              </Link>
            </li>
            <li>
              <Link 
                to="/create-student" 
                className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors text-2xl"
              >
                학생 생성
              </Link>
            </li>
            <li>
              <a 
                href="https://huggingface.co/spaces/ll7098ll/stock2" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors text-2xl"
              >
                학생용 사이트
              </a>
            </li>
            <li className="mt-8">
              <button 
                onClick={handleLogout}
                className="block px-2 py-1 rounded hover:bg-gray-700 transition-colors text-xl"
              >
                
                로그아웃
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className="absolute bottom-4 left-4">
      <a href="https://onmusil.gyo6.net/apps/board/AN3pZdDJL7I" target="_blank" rel="noopener noreferrer">
          <img src="https://huggingface.co/spaces/powerwarez/gailabicon/resolve/main/gailab07.png" alt="gailab" className="w-16 h-16" />
        </a>
        <h2 className="text-xl mt-2">제작: 이병민, 서동성</h2>
      </div>
    </div>
  );
};

export default Sidebar;
