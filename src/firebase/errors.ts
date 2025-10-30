'use client';

type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

interface AuthToken {
  name: string | null;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  sub: string;
  auth: {
    identities: Record<string, string[]>;
    sign_in_provider: string;
    tenant: string | null;
  };
}

interface AuthObject {
  uid: string;
  token: AuthToken;
}

interface SecurityRuleRequest {
  auth: AuthObject | null;
  method: string;
  path: string;
  resource?: {
    data: any;
  };
}

/**
 * Builds a security-rule-compliant auth object from the user session.
 * @param currentUser The currently authenticated user from NextAuth.
 * @returns An object that mirrors request.auth in security rules, or null.
 */
function buildAuthObject(currentUser: any | null): AuthObject | null {
  if (!currentUser) {
    return null;
  }

  const token: AuthToken = {
    name: currentUser.name || null,
    email: currentUser.email || null,
    email_verified: true, // NextAuth handles email verification
    phone_number: null,
    sub: currentUser.id || currentUser.uid || '',
    auth: {
      identities: {},
      sign_in_provider: 'credentials',
      tenant: null,
    },
  };

  return {
    uid: currentUser.id || currentUser.uid || '',
    token: token,
  };
}

/**
 * Builds the complete, simulated request object for the error message.
 * Note: This is a compatibility layer - auth information is not available in this context.
 * @param context The context of the failed operation.
 * @returns A structured request object.
 */
function buildRequestObject(context: SecurityRuleContext): SecurityRuleRequest {
  // In MongoDB context, we don't have direct access to session here
  // This is kept for compatibility with existing error handling
  const authObject: AuthObject | null = null;

  return {
    auth: authObject,
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
  };
}

/**
 * Builds the final, formatted error message for the LLM.
 * @param requestObject The simulated request object.
 * @returns A string containing the error message and the JSON payload.
 */
function buildErrorMessage(requestObject: SecurityRuleRequest): string {
  return `Missing or insufficient permissions: The following request was denied:
${JSON.stringify(requestObject, null, 2)}`;
}

/**
 * A custom error class designed to be consumed by an LLM for debugging.
 * It structures the error information to mimic the request object
 * available in database security rules.
 */
export class FirestorePermissionError extends Error {
  public readonly request: SecurityRuleRequest;

  constructor(context: SecurityRuleContext) {
    const requestObject = buildRequestObject(context);
    super(buildErrorMessage(requestObject));
    this.name = 'PermissionError';
    this.request = requestObject;
  }
}
