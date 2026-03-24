// Default mapping for human-friendly subdomains to database Client IDs
export const mapSubdomainToClientId = (subdomain: string): string => {
    // The backend now securely looks up either the specific Name or this exact subdomain 
    // in the public.clients table. We will prioritize sending the exact subdomain strings 
    // to cleanly interface with the new `subdomain` column in our AdminClient model.
    return subdomain.toLowerCase();
};

export const getTenantFromUrl = (): string | null => {
    // Only run in browser environment
    if (typeof window === 'undefined') return null;

    const hostname = window.location.hostname;

    // 1. Local environment testing (e.g. prahitha.localhost)
    if (hostname.endsWith('.localhost')) {
        const subdomain = hostname.replace('.localhost', '');
        return mapSubdomainToClientId(subdomain);
    }

    // 2. Production domain testing (e.g. prahitha.acharyaboard.co.in)
    // We check if the string ends with the base domain to allow subdomains
    const baseDomain = 'acharyaboard.co.in';
    if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
        // Extract subdomain part
        const subdomain = hostname.replace(`.${baseDomain}`, '');
        // Trim any trailing dot just in case
        const cleanSubdomain = subdomain.replace(/\.$/, '');
        if (cleanSubdomain !== 'www') {
            return mapSubdomainToClientId(cleanSubdomain);
        }
    }

    // No valid subdomain found
    return null;
};
