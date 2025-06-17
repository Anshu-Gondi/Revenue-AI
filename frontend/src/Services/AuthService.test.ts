import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService, type Tokens } from './AuthService';

declare const global: any;

describe('AuthService', () => {
  beforeEach(() => {
    // reset localStorage and fetch
    localStorage.clear();
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('login() returns tokens on 200', async () => {
    const fake: Tokens = { access:'tokA', refresh:'tokR' };
    (fetch as any).mockResolvedValue({
      ok: true, json: () => Promise.resolve(fake)
    });
    const res = await AuthService.login('u','p');
    expect(res).toEqual(fake);
  });

  it('login() returns error detail on failure', async () => {
    (fetch as any).mockResolvedValue({
      ok: false, json: () => Promise.resolve({ detail:'fail' })
    });
    const res = await AuthService.login('u','p');
    expect(res).toEqual({ detail:'fail' });
  });

  it('signup() returns data on success', async () => {
    const data = { id:1,username:'u' };
    (fetch as any).mockResolvedValue({ ok:true, json:() => Promise.resolve(data)});
    const res = await AuthService.signup('u','e','p');
    expect(res).toEqual(data);
  });

  it('googleLogin() handles 200 and error', async () => {
    const payload = { access:'A', refresh:'R' };
    (fetch as any).mockResolvedValue({ ok:true, json:() => Promise.resolve({ access_token:'A',refresh_token:'R'})});
    const ok = await AuthService.googleLogin('idtok');
    expect(ok).toEqual(payload);

    (fetch as any).mockResolvedValue({ ok:false, json:() => Promise.resolve({ detail:'err'})});
    const fail = await AuthService.googleLogin('bad');
    expect(fail).toEqual({ detail:'err' });
  });

  it('fetchWithAuth retries on 401 then logs out if refresh fails', async () => {
    // 401 on first fetch
    (fetch as any)
      .mockResolvedValueOnce({ status:401 })
      .mockResolvedValueOnce({ ok:false })    // refresh fail
      .mockResolvedValueOnce({});             // would be original retry

    // ensure logout is spyable
    const logoutSpy = vi.spyOn(AuthService, 'logout');
    await expect(
      AuthService.fetchWithAuth('/x')
    ).rejects.toThrow();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
