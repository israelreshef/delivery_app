import Script from 'next/script';

export default function StructuredData() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'LogisticsService',
        'name': 'TZIR Delivery System',
        'alternateName': 'ציר שליחויות',
        'url': 'https://app.tzir.com',
        'logo': 'https://app.tzir.com/logo.png',
        'description': 'Advanced AI-powered delivery management system for businesses and couriers in Israel.',
        'areaServed': 'Israel',
        'sameAs': [
            'https://facebook.com/tzir',
            'https://twitter.com/tzir',
            'https://linkedin.com/company/tzir'
        ],
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'Rothschild Blvd 1',
            'addressLocality': 'Tel Aviv',
            'addressCountry': 'IL'
        },
        'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+972-50-0000000',
            'contactType': 'customer service',
            'availableLanguage': ['Hebrew', 'English', 'Russian', 'Arabic']
        },
        'offers': {
            '@type': 'Offer',
            'itemOffered': {
                '@type': 'Service',
                'name': 'Same Day Delivery'
            }
        }
    };

    return (
        <Script
            id="json-ld-structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
