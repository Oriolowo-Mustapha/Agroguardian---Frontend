import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const readParam = (params, names) => {
  for (const name of names) {
    const value = params.get(name);
    if (value) return value;
  }
  return null;
};

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const safeBase64JsonParse = (value) => {
  try {
    return safeJsonParse(atob(value));
  } catch {
    return null;
  }
};

const parseCallbackParams = (search, hash) => {
  const fromSearch = new URLSearchParams(search);
  const fromHash = new URLSearchParams(hash?.startsWith('#') ? hash.slice(1) : hash);

  const accessToken =
    readParam(fromSearch, ['accessToken', 'access_token', 'token']) ||
    readParam(fromHash, ['accessToken', 'access_token', 'token']);

  const refreshToken =
    readParam(fromSearch, ['refreshToken', 'refresh_token']) ||
    readParam(fromHash, ['refreshToken', 'refresh_token']);

  const error =
    readParam(fromSearch, ['error', 'message']) ||
    readParam(fromHash, ['error', 'message']);

  const userRaw =
    readParam(fromSearch, ['user']) ||
    readParam(fromHash, ['user']);

  let user = null;
  if (userRaw) {
    user = safeJsonParse(userRaw) || safeBase64JsonParse(userRaw);
  }

  return { accessToken, refreshToken, user, error };
};

const GoogleAuthCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const { accessToken, refreshToken, user, error: err } = parseCallbackParams(
      location.search,
      location.hash
    );

    if (err) {
      setError(decodeURIComponent(err));
      return;
    }

    if (!accessToken) {
      setError('Google sign-in did not return an access token.');
      return;
    }

    setAuth(user, accessToken, refreshToken);
    setDone(true);
    navigate('/dashboard', { replace: true });
  }, [location.search, location.hash, navigate, setAuth]);

  return (
    <div className="min-h-screen bg-[#FDFCF0] flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Signing you in…</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-4">
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Google sign-in failed</div>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link to="/login">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-gray-700 font-medium">
              <Loader2 className="h-5 w-5 animate-spin" />
              {done ? 'Redirecting…' : 'Completing Google authentication…'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthCallbackPage;
