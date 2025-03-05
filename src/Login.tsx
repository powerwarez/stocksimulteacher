import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // supabaseClient.tsx에서 가져옵니다.

function Login() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({ displayName: '', email: '' });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { user } = session;
        setUserInfo({
          displayName: user.user_metadata.full_name,
          email: user.email,
        });
        navigate('/mainpage');
      }
    };

    checkSession();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) console.error('Error logging in with Google:', error.message);
  };

  return (
    <div className="login-page">
      <button onClick={handleGoogleLogin}>Login with Google</button>
    </div>
  );
}

export default Login;
