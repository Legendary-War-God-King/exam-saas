import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  it('should inject tenant from user', () => {
    const guard = new TenantGuard();
    const req: any = { user: { tenantId: 't1' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };

    guard.canActivate(ctx);

    expect(req.tenant).toEqual({ id: 't1' });
  });

  it('should not fail when no user', () => {
    const guard = new TenantGuard();
    const req: any = {};
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };

    expect(() => guard.canActivate(ctx)).not.toThrow();
    expect(req.tenant).toBeUndefined();
  });
});
