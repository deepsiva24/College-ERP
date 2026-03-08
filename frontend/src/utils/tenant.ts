// Default mapping for human-friendly subdomains to database Client IDs
export const mapSubdomainToClientId = (subdomain: string): string => {
    const mapping: Record<string, string> = {
        'demo': 'Demo School',
        'prahitha': 'Prahitha Educational',
        'acharyaboard': 'Acharyaboard Default'
    };

    // If we have a specific mapping, use it. Otherwise, capitalize the subdomain as a fallback.
    return mapping[subdomain.toLowerCase()] || (subdomain.charAt(0).toUpperCase() + subdomain.slice(1));
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
        if (subdomain !== 'www') {
            return mapSubdomainToClientId(subdomain);
        }
    }

    // No valid subdomain found
    return null;
};
