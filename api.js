// ============================================
// VIRUS MLM - API Client
// Все запросы к backend
// ============================================

(function (global) {
  'use strict';

  // ============================================
  // Конфигурация
  // ============================================
  const API_URL = 'https://api.virusmlm.com';
  // Для локальной разработки:
  // const API_URL = 'http://localhost:3000';

  const TOKEN_KEY = 'virusmlm_token';
  const USER_KEY = 'virusmlm_user';

  // ============================================
  // Хранение токена
  // ============================================
  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    return !!getToken();
  }

  // ============================================
  // Базовый fetch
  // ============================================
  async function request(method, path, body, options) {
    const opts = options || {};
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = getToken();
    if (token && !opts.skipAuth) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const fetchOptions = {
      method: method,
      headers: headers,
    };

    if (body !== undefined && body !== null) {
      fetchOptions.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(API_URL + path, fetchOptions);
    } catch (networkError) {
      throw {
        code: 'NETWORK_ERROR',
        message: 'Не удалось подключиться к серверу. Проверьте интернет.',
        details: networkError,
      };
    }

    if (response.status === 401) {
      clearToken();
      throw {
        code: 'UNAUTHORIZED',
        message: 'Сессия истекла. Войдите заново.',
      };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Сервер вернул некорректный ответ.',
      };
    }

    if (!response.ok || !data.success) {
      const err = data.error || {};
      throw {
        code: err.code || 'HTTP_' + response.status,
        message: err.message || 'Ошибка запроса',
        details: err.details,
      };
    }

    return data.data;
  }

  // ============================================
  // Auth API
  // ============================================
  async function sendCode(email, turnstileToken) {
    return request('POST', '/api/v1/auth/send-code', {
      email: email,
      turnstileToken: turnstileToken || 'test',
    }, { skipAuth: true });
  }

  async function register(email, code, referrerVirId, turnstileToken, acceptOffer) {
    const result = await request('POST', '/api/v1/auth/register', {
      email: email,
      code: code,
      referrerVirId: referrerVirId || '',
      turnstileToken: turnstileToken || 'test',
      acceptOffer: acceptOffer === true,
    }, { skipAuth: true });

    if (result.token) {
      setToken(result.token);
      setUser({
        userId: result.userId,
        virId: result.virId,
        email: result.email,
      });
    }
    return result;
  }

  async function login(email, turnstileToken) {
    return request('POST', '/api/v1/auth/login', {
      email: email,
      turnstileToken: turnstileToken || 'test',
    }, { skipAuth: true });
  }

  async function loginVerify(email, code) {
    const result = await request('POST', '/api/v1/auth/login/verify', {
      email: email,
      code: code,
    }, { skipAuth: true });

    if (result.token) {
      setToken(result.token);
      setUser({
        userId: result.userId,
        virId: result.virId,
        email: result.email,
      });
    }
    return result;
  }

  // ============================================
  // User API
  // ============================================
  async function getMe() {
    return request('GET', '/api/v1/user/me');
  }

  async function getMatrix() {
    return request('GET', '/api/v1/user/matrix');
  }

  async function getReferrals() {
    return request('GET', '/api/v1/user/referrals');
  }

  async function getPayouts(limit, offset) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    const qs = params.toString();
    return request('GET', '/api/v1/user/payouts' + (qs ? '?' + qs : ''));
  }

  async function activatePacket(packetIndex) {
    return request('POST', '/api/v1/user/activate-packet', {
      packetIndex: packetIndex,
    });
  }

  // ============================================
  // Pool API (public)
  // ============================================
  async function getPoolInfo() {
    return request('GET', '/api/v1/pool/info', null, { skipAuth: true });
  }

  // ============================================
  // Экспорт
  // ============================================
  const api = {
    // Конфиг
    API_URL: API_URL,

    // Токен
    setToken: setToken,
    getToken: getToken,
    clearToken: clearToken,
    setUser: setUser,
    getUser: getUser,
    isAuthenticated: isAuthenticated,

    // Auth
    sendCode: sendCode,
    register: register,
    login: login,
    loginVerify: loginVerify,

    // User
    getMe: getMe,
    getMatrix: getMatrix,
    getReferrals: getReferrals,
    getPayouts: getPayouts,
    activatePacket: activatePacket,

    // Pool (public)
    getPoolInfo: getPoolInfo,

    // Raw request (для отладки)
    request: request,
  };

  global.api = api;
})(window);
