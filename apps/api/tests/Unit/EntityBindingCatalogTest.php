<?php

use App\Support\EntityBindingCatalog;

it('lists the expected sources', function () {
    expect(EntityBindingCatalog::sources())->toEqualCanonicalizing([
        'hospital',
        'patient',
        'user',
        'report',
        'signatory',
        'test',
    ]);
});

it('accepts whitelisted paths and rejects unknown ones', function () {
    expect(EntityBindingCatalog::isValid('hospital', 'parent_org_line'))->toBeTrue()
        ->and(EntityBindingCatalog::isValid('patient', 'dob'))->toBeTrue()
        ->and(EntityBindingCatalog::isValid('signatory', 'sip_number'))->toBeTrue()
        ->and(EntityBindingCatalog::isValid('hospital', 'not_a_field'))->toBeFalse()
        ->and(EntityBindingCatalog::isValid('bogus', 'name'))->toBeFalse();
});

it('covers the hospital attributes the header_config needs', function () {
    $hospitalMap = EntityBindingCatalog::map()['hospital'];

    foreach ([
        'name',
        'parent_org_line',
        'address',
        'address_line_1',
        'city',
        'province',
        'phone',
        'logo_url',
        'secondary_logo_url',
    ] as $expected) {
        expect($hospitalMap)->toContain($expected);
    }
});
