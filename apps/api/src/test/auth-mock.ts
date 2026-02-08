import { ExecutionContext } from '@nestjs/common';

export const mockOrganizationId = 'test-org-id';
export const mockUserId = 'test-user-id';

export const createMockExecutionContext = (overrides?: {
  organizationId?: string;
  userId?: string;
}): Partial<ExecutionContext> => ({
  switchToHttp: () =>
    ({
      getRequest: () => ({
        user: {
          organizationId: overrides?.organizationId || mockOrganizationId,
          userId: overrides?.userId || mockUserId,
          sub: overrides?.userId || mockUserId,
        },
      }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }) as any,
});

export const mockRequest = (overrides?: {
  organizationId?: string;
  userId?: string;
}) => ({
  user: {
    organizationId: overrides?.organizationId || mockOrganizationId,
    userId: overrides?.userId || mockUserId,
    sub: overrides?.userId || mockUserId,
  },
});
