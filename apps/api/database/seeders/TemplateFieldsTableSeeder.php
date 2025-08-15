<?php

namespace database\seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class TemplateFieldsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * template_id → which template this belongs to
     * section → group name (e.g., "TEE Procedure")
     * label → human-readable label (e.g., "Anesthesia")
     * type → field type (select, number, text, textarea, checkbox_group, etc.)
     * options → JSON array if applicable, otherwise null
     * order → sorts within the section
     * field_group_order → ordering of the section itself
     * timestamps
     *
     */
    public function run(): void
    {
        $templateId = DB::table('templates')->where('name', 'TEE Default v1')->value('id');
        if (!$templateId) {
            throw new RuntimeException('Template "TEE Default v1" not found. Seed templates first.');
        }

        // Helpers
        $g = fn($n) => $n * 1000;         // section ordering
        $add = function (array &$fields, string $section, string $label, string $type, ?array $options, int $order, int $group) {
            $fields[] = [
                'template_id' => $GLOBALS['templateId'],
                'section' => $section,
                'label' => $label,
                'type' => $type,
                'options' => $options ? json_encode($options) : null,
                'order' => $order,
                'field_group_order' => $group,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        };

        // Make $templateId available in closure above
        $GLOBALS['templateId'] = $templateId;

        $fields = [];

        // ===================== 1) HEADER =====================
        $i = 0;
        $section = 'Header';
        $group = $g(1);
        $add($fields, $section, 'Logo URL', 'text', null, ++$i, $group);
        $add($fields, $section, 'Report Title', 'text', null, ++$i, $group); // e.g., "Transesophageal Echocardiography Report"
        $add($fields, $section, 'Hospital Name', 'text', null, ++$i, $group);
        $add($fields, $section, 'Unit / Department', 'text', null, ++$i, $group);
        $add($fields, $section, 'Address', 'textarea', null, ++$i, $group);
        $add($fields, $section, 'Phone / Fax', 'text', null, ++$i, $group);

        // ===================== 2) TEE PROCEDURE =====================
        $i = 0;
        $section = 'TEE Procedure';
        $group = $g(2);
        $add($fields, $section, 'Anesthesia', 'select', ['None', 'Topical spray (Xylocaine 10%)', 'General anesthesia'], ++$i, $group);
        $add($fields, $section, 'Sedation', 'select', ['Yes', 'No'], ++$i, $group);
        $add($fields, $section, 'Duration (min)', 'number', null, ++$i, $group);
        $add($fields, $section, 'Complication', 'select', ['None', 'Minor', 'Major', 'Bleeding', 'Hypoxia', 'Arrhythmia', 'Esophageal injury', 'Other'], ++$i, $group);
        $add($fields, $section, 'Complication (details)', 'text', null, ++$i, $group);

        // ===================== 3) PATIENT & STUDY =====================
        $i = 0;
        $section = 'Patient & Study';
        $group = $g(3);
        $add($fields, $section, 'Study Date', 'date', null, ++$i, $group);
        $add($fields, $section, 'MRN', 'text', null, ++$i, $group);
        $add($fields, $section, 'DOB', 'date', null, ++$i, $group);
        $add($fields, $section, 'Age', 'number', null, ++$i, $group);
        $add($fields, $section, 'Gender', 'select', ['Male', 'Female', 'Other'], ++$i, $group);
        $add($fields, $section, 'First Write Time', 'text', null, ++$i, $group);
        $add($fields, $section, 'Last Write Time', 'text', null, ++$i, $group);
        $add($fields, $section, 'Height (cm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'Weight (kg)', 'number', null, ++$i, $group);
        $add($fields, $section, 'BSA (m²)', 'number', null, ++$i, $group);
        $add($fields, $section, 'Blood Pressure (mmHg)', 'text', null, ++$i, $group);

        // ===================== 4) M‑MODE / 2D =====================
        $i = 0;
        $section = 'M‑mode / 2D';
        $group = $g(4);
        $add($fields, $section, 'IVSd (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'IVSs (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LVIDd (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LVIDs (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LVPWd (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LVPWs (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'Aortic Root Diameter (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LA dimension (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LVOT diameter (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LA/Ao', 'number', null, ++$i, $group);
        $add($fields, $section, 'LAVI (ml/m²)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LV Mass Index (g/m²)', 'number', null, ++$i, $group);

        // ===================== 5) DOPPLER =====================
        $i = 0;
        $section = 'Doppler';
        $group = $g(5);
        $add($fields, $section, 'MV E velocity (m/s)', 'number', null, ++$i, $group);
        $add($fields, $section, 'MV Deceleration Time (ms)', 'number', null, ++$i, $group);
        $add($fields, $section, "E/E' (medial)", 'number', null, ++$i, $group);
        $add($fields, $section, "E/E' (lateral)", 'number', null, ++$i, $group);
        $add($fields, $section, "E/E' (average)", 'number', null, ++$i, $group);
        $add($fields, $section, 'AV max PG (mmHg)', 'number', null, ++$i, $group);
        $add($fields, $section, 'AV mean PG (mmHg)', 'number', null, ++$i, $group);
        $add($fields, $section, 'AI PHT (ms)', 'number', null, ++$i, $group);
        $add($fields, $section, 'AI EROA (cm²)', 'number', null, ++$i, $group);
        $add($fields, $section, 'LVOT VTI (cm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'Descending Aorta (EDV/Vmax)', 'number', null, ++$i, $group);
        $add($fields, $section, 'AVA (VTI) (cm²)', 'number', null, ++$i, $group);
        $add($fields, $section, 'AVA (Vmax) (cm²)', 'number', null, ++$i, $group);
        $add($fields, $section, 'AVA (planimetry) (cm²)', 'number', null, ++$i, $group);
        $add($fields, $section, 'SV (LVOT) (ml)', 'number', null, ++$i, $group);

        // ===================== 6) GLOBAL FUNCTION =====================
        $i = 0;
        $section = 'Global Function';
        $group = $g(6);
        $add($fields, $section, 'EDV (Teichholz) (ml)', 'number', null, ++$i, $group);
        $add($fields, $section, 'ESV (Teichholz) (ml)', 'number', null, ++$i, $group);
        $add($fields, $section, 'EF (Teichholz) (%)', 'number', null, ++$i, $group);
        $add($fields, $section, 'FS (%)', 'number', null, ++$i, $group);
        $add($fields, $section, "EF (Simpson’s Biplane) (%)", 'number', null, ++$i, $group);
        $add($fields, $section, "EF (Simpson’s 4ch) (%)", 'number', null, ++$i, $group);
        $add($fields, $section, "EF (Simpson’s 2ch) (%)", 'number', null, ++$i, $group);
        $add($fields, $section, 'TAPSE (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'IVC (Inspiration) (mm)', 'number', null, ++$i, $group);
        $add($fields, $section, 'IVC (Expiration) (mm)', 'number', null, ++$i, $group);

        // ===================== 7) STUDY META =====================
        $i = 0;
        $section = 'Study Meta';
        $group = $g(7);
        $add($fields, $section, 'ECG Rhythm', 'checkbox_group', [
            'ECG is sinus rhythm', 'ECG is in atrial fibrillation', 'ECG is pacing rhythm', 'Other'
        ], ++$i, $group);
        $add($fields, $section, 'ECG (custom text)', 'textarea', null, ++$i, $group);
        $add($fields, $section, 'Study Quality', 'checkbox_group', [
            'The quality of the study is good', 'The quality of the study is adequate',
            'The quality of the study is poor', 'The study is technically difficult due to ...'
        ], ++$i, $group);
        $add($fields, $section, 'Study Quality (custom text)', 'textarea', null, ++$i, $group);

        // ===================== 8) LV =====================
        $i = 0;
        $section = 'LV';
        $group = $g(8);
        $add($fields, $section, 'LV (overall)', 'checkbox_group', ['Normal', 'Abnormal'], ++$i, $group);
        $add($fields, $section, 'Cavity Size', 'checkbox_group', [
            'Left ventricle size is normal', 'Left ventricle is dilated', 'Left ventricle is smallish', 'Left ventricle is D-shaped'
        ], ++$i, $group);
        $add($fields, $section, 'Wall Thickness', 'checkbox_group', [
            'Wall thickness is normal', 'Asymmetric septal hypertrophy', 'Concentric remodeling',
            'Concentric LV hypertrophy', 'Eccentric LV hypertrophy'
        ], ++$i, $group);
        $add($fields, $section, 'Global Systolic Function', 'checkbox_group', [
            'Global LV systolic function is normal', 'Global LV systolic function is reduced'
        ], ++$i, $group);
        $add($fields, $section, 'Diastolic Function', 'checkbox_group', [
            'LV Diastolic Function is normal', 'LV Diastolic Function is abnormal', 'LV Diastolic Function is indeterminate'
        ], ++$i, $group);
        $add($fields, $section, 'LV (notes)', 'textarea', null, ++$i, $group);

        // ===================== 9) RV / LA / RA =====================
        $i = 0;
        $section = 'RV / LA / RA';
        $group = $g(9);
        $add($fields, $section, 'RV (overall)', 'checkbox_group', ['Normal (size and function)', 'Abnormal'], ++$i, $group);
        $add($fields, $section, 'RV Wall Thickness', 'checkbox_group', ['Normal', 'Right ventricular hypertrophy'], ++$i, $group);
        $add($fields, $section, 'RV Systolic Function', 'checkbox_group', ['Normal', 'Decreased'], ++$i, $group);
        $add($fields, $section, 'LA Size', 'checkbox_group', ['Left atrial size is normal', 'Left atrium is dilated'], ++$i, $group);
        $add($fields, $section, 'RA Size', 'checkbox_group', ['Right atrial size is normal', 'Right atrium is dilated'], ++$i, $group);
        $add($fields, $section, 'Right heart (notes)', 'textarea', null, ++$i, $group);

        // ===================== 10) INTERATRIAL / INTERVENTRICULAR SEPTUM =====================
        $i = 0;
        $section = 'Interatrial Septum';
        $group = $g(10);
        $add($fields, $section, 'Interatrial Septum Findings', 'checkbox_group', [
            'Intact interatrial septum', 'Atrial septal aneurysm', 'Hyperkinetic interatrial septum',
            'Gap at interatrial septum (size ...)', 'Stretched PFO L→R shunt', 'Iatrogenic ASD (size ...)',
            'Post ASO closure', 'Post device closure'
        ], ++$i, $group);
        $add($fields, $section, 'IAS (notes)', 'textarea', null, ++$i, $group);

        $i = 0;
        $section = 'Interventricular Septum';
        $group = $g(11);
        $add($fields, $section, 'Interventricular Septum Findings', 'checkbox_group', [
            'Intact interventricular septum', 'Gap at IVS (size ...)', 'Ventricular septal rupture'
        ], ++$i, $group);
        $add($fields, $section, 'IVS (notes)', 'textarea', null, ++$i, $group);

        // ===================== 11) AORTIC VALVE =====================
        $i = 0;
        $section = 'Aortic Valve';
        $group = $g(12);
        $add($fields, $section, 'Structure', 'checkbox_group', [
            'Not well visualized / cusp number unknown', 'Trileaflet', 'Bicuspid', 'Leaflets thickened',
            'Rheumatic appearance', 'No calcification', 'Cusp heavily calcified', 'Calcification at ...', 'Nodular thickening of ...'
        ], ++$i, $group);
        $add($fields, $section, 'Function', 'checkbox_group', [
            'Opens well', 'Not heavily calcified', 'Systolic doming', 'Prolapse of ...', 'Flail of ...'
        ], ++$i, $group);
        $add($fields, $section, 'Regurgitation', 'checkbox_group', [
            'None', 'Trace', 'Mild', 'Mild–moderate', 'Moderate', 'Moderate–severe', 'Severe', 'Jet central', 'Jet eccentric'
        ], ++$i, $group);
        $add($fields, $section, 'Stenosis', 'checkbox_group', [
            'No valvular AS', 'Mild AS', 'Mild–moderate AS', 'Moderate AS', 'Moderate–severe AS', 'Severe AS',
            'Subaortic stenosis', 'Supravalvar stenosis', 'Paradoxical AS', 'Low‑flow low‑gradient AS'
        ], ++$i, $group);
        $add($fields, $section, 'Vegetations / Abscess', 'checkbox_group', [
            'No vegetation', 'Cannot exclude vegetation', 'Vegetation at ...', 'Mobile vegetation at ...', 'Abscess at ...'
        ], ++$i, $group);
        $add($fields, $section, 'Repair / Prosthetic', 'checkbox_group', [
            'Post repair', 'Bioprosthetic replacement', 'Mechanical replacement', 'Homograft present',
            'Opening not well visualized', 'Well‑seated', 'Opens well', 'Limited opening',
            'No thrombus', 'Possible thrombus', 'No leakage', 'Central leakage', 'Paravalvar leakage',
            'Doppler: normal prosthetic gradient', 'Doppler: increased prosthetic gradient',
            'Prosthetic vegetations suspected', 'Prosthetic vegetations present', 'Rocking suggests dehiscence'
        ], ++$i, $group);
        $add($fields, $section, 'Aortic Valve (notes)', 'textarea', null, ++$i, $group);

        // ===================== 12) MITRAL VALVE =====================
        $i = 0;
        $section = 'Mitral Valve';
        $group = $g(13);
        $add($fields, $section, 'Structure', 'checkbox_group', [
            'Not well visualized', 'Normal structure', 'Leaflets thickened', 'Rheumatic appearance', 'Myxomatous leaflets',
            'Redundant elongated chordae', 'No annular calcification', 'Mitral annular calcification',
            'Mitral cleft present', 'Chordae thickened/calcified', 'Papillary muscle thickened/calcified'
        ], ++$i, $group);
        $add($fields, $section, 'Function', 'checkbox_group', [
            'Opens well', 'Doming with minimal stenosis', 'Doming with restricted opening', 'Opening restricted',
            'Systolic tenting', 'Billowing without prolapse', 'Prolapse of ...', 'Flail of ...',
            'Chordal rupture', 'Perforation of ...', 'No SAM', 'Chordal SAM', 'Systolic anterior motion present'
        ], ++$i, $group);
        $add($fields, $section, 'Regurgitation', 'checkbox_group', [
            'None', 'Trace', 'Mild', 'Mild–moderate', 'Moderate', 'Moderate–severe', 'Severe',
            'Jet central', 'Jet eccentric', 'Pulmonary vein systolic reversal'
        ], ++$i, $group);
        $add($fields, $section, 'Stenosis', 'checkbox_group', [
            'No MS', 'Mild MS', 'Mild–moderate MS', 'Moderate MS', 'Moderate–severe MS', 'Severe MS', "Wilkins' score"
        ], ++$i, $group);
        $add($fields, $section, 'Vegetations / Abscess', 'checkbox_group', [
            'No vegetation', 'Cannot exclude vegetation', 'Vegetation at ...', 'Mobile vegetation at ...', 'Abscess at ...'
        ], ++$i, $group);
        $add($fields, $section, 'Repair / Prosthetic', 'checkbox_group', [
            'Post repair', 'Repair with ring annuloplasty',
            'Bioprosthetic replacement', 'Mechanical replacement',
            'No residual MR', 'Residual MR', 'Residual MS',
            'Prosthetic valve abnormal', 'Opening not well visualized', 'Well‑seated', 'Opens well', 'Limited opening',
            'No thrombus', 'Possible thrombus', 'No leakage', 'Central leakage', 'Paravalvar leakage',
            'Doppler normal prosthetic MV gradient', 'Doppler increased prosthetic MV gradient', 'Abnormal prosthetic MV gradient',
            'Prosthetic vegetations suspected', 'Prosthetic vegetations present', 'Rocking suggests dehiscence'
        ], ++$i, $group);
        $add($fields, $section, 'Mitral Valve (notes)', 'textarea', null, ++$i, $group);

        // ===================== 13) TRICUSPID VALVE =====================
        $i = 0;
        $section = 'Tricuspid Valve';
        $group = $g(14);
        $add($fields, $section, 'Structure', 'checkbox_group', [
            'Not well visualized', 'Normal structure', 'Rheumatic appearance', 'Leaflets thickened',
            'Carcinoid pattern', 'No annular calcification', 'Annular calcification'
        ], ++$i, $group);
        $add($fields, $section, 'Function', 'checkbox_group', [
            'Opens well', 'Doming with minimal stenosis', 'Doming with restricted opening',
            'Leaflet tenting', 'Uncoaptation', 'Prolapse of ...', 'Flail of ...'
        ], ++$i, $group);
        $add($fields, $section, 'Regurgitation', 'checkbox_group', [
            'None', 'Trace', 'Mild', 'Mild–moderate', 'Moderate', 'Moderate–severe', 'Severe',
            'Jet central', 'Jet eccentric', 'Hepatic vein systolic reversal'
        ], ++$i, $group);
        $add($fields, $section, 'Stenosis', 'checkbox_group', ['No TS', 'Non‑significant TS', 'Significant TS'], ++$i, $group);
        $add($fields, $section, 'Vegetations / Abscess', 'checkbox_group', [
            'No vegetation', 'Cannot exclude vegetation', 'Vegetation at ...', 'Mobile vegetation at ...', 'Abscess at ...'
        ], ++$i, $group);
        $add($fields, $section, 'Repair / Prosthetic', 'checkbox_group', [
            'Post repair', 'Post repair with ring annuloplasty',
            'Bioprosthetic replacement', 'Mechanical replacement',
            'No residual TR', 'Residual TR', 'Residual TS',
            'Well‑seated', 'Opens well', 'Limited opening', 'Abnormal prosthetic valve',
            'Opening not well visualized', 'No thrombus', 'Possible thrombus',
            'No leakage', 'Central leakage', 'Paravalvar leakage',
            'Doppler normal prosthetic TV gradient', 'Doppler increased prosthetic TV gradient',
            'Abnormal increase of prosthetic TV gradient',
            'Prosthetic vegetations suspected', 'Prosthetic vegetations present', 'Rocking suggests dehiscence'
        ], ++$i, $group);
        $add($fields, $section, 'Tricuspid Valve (notes)', 'textarea', null, ++$i, $group);

        // ===================== 14) PULMONIC VALVE =====================
        $i = 0;
        $section = 'Pulmonic Valve';
        $group = $g(15);
        $add($fields, $section, 'Structure', 'checkbox_group', [
            'Not well visualized', 'Grossly normal', 'Thickened', 'Notching of PV Doppler (↑PVR)', 'Absent pulmonary valve'
        ], ++$i, $group);
        $add($fields, $section, 'Function', 'checkbox_group', [
            'Opens well', 'Doming with minimal stenosis', 'Doming with restricted opening', 'Prolapse of ...', 'Flail of ...'
        ], ++$i, $group);
        $add($fields, $section, 'Regurgitation', 'checkbox_group', ['None', 'Trace', 'Mild', 'Mild–moderate', 'Moderate', 'Moderate–severe', 'Severe'], ++$i, $group);
        $add($fields, $section, 'Stenosis', 'checkbox_group', [
            'No PS', 'Non‑significant PS', 'Significant PS (gradient ...)', 'Pulmonary stenosis', 'Supravalvar PS'
        ], ++$i, $group);
        $add($fields, $section, 'Vegetations / Abscess', 'checkbox_group', [
            'No vegetation', 'Cannot exclude vegetation', 'Vegetation at ...', 'Mobile vegetation at ...'
        ], ++$i, $group);
        $add($fields, $section, 'Repair / Prosthetic', 'checkbox_group', [
            'Post repair', 'Bioprosthetic replacement', 'No residual PR', 'Residual PR', 'Residual PS',
            'Prosthetic PV opens well', 'Prosthetic PV opening limited', 'Normal prosthetic PV gradient', 'Abnormal prosthetic PV gradient'
        ], ++$i, $group);
        $add($fields, $section, 'Pulmonic Valve (notes)', 'textarea', null, ++$i, $group);

        // ===================== 15) MASS / THROMBUS =====================
        $i = 0;
        $section = 'Mass / Thrombus';
        $group = $g(16);
        $add($fields, $section, 'Findings', 'checkbox_group', [
            'No abnormal mass or thrombus', 'Mass/Thrombus cannot be clearly visualized',
            'Spontaneous echo contrast at ...', 'Thrombus at ...', 'Mass at ...', 'Myxoma present at ...'
        ], ++$i, $group);
        $add($fields, $section, 'Mass / Thrombus (notes)', 'textarea', null, ++$i, $group);

        // ===================== 16) PERICARDIUM =====================
        $i = 0;
        $section = 'Pericardium';
        $group = $g(17);
        $add($fields, $section, 'Findings', 'checkbox_group', [
            'Pericardium is normal', 'No pericardial effusion', 'Pericardial effusion at ...',
            'No sign of tamponade', 'Findings consistent with tamponade', 'Pericardium thickened',
            'Pericardium calcified', 'Findings consistent with constrictive pericarditis'
        ], ++$i, $group);
        $add($fields, $section, 'Pericardium (notes)', 'textarea', null, ++$i, $group);

        // ===================== 17) AORTA =====================
        $i = 0;
        $section = 'Aorta';
        $group = $g(18);
        $add($fields, $section, 'Findings', 'checkbox_group', [
            'No atheroma at descending aorta', 'Atheroma plaque at descending aorta',
            'Aortic dissection at ...', 'Aortic diameter ...'
        ], ++$i, $group);
        $add($fields, $section, 'Aorta (notes)', 'textarea', null, ++$i, $group);

        // ===================== 18) WALL MOTION =====================
        $i = 0;
        $section = 'Wall Motion';
        $group = $g(19);
        $add($fields, $section, '2D Wall‑Motion Diagram', 'checkbox_group', ['Normal', 'Hypokinesia', 'Akinesia', 'Aneurysm', 'Dyskinesia', 'Unknown'], ++$i, $group);

        // ===================== 19) SUMMARY / ADMIN =====================
        $i = 0;
        $section = 'Summary';
        $group = $g(20);
        $add($fields, $section, 'Diagnosis', 'textarea', null, ++$i, $group);
        $add($fields, $section, 'Conclusion', 'textarea', null, ++$i, $group);
        $add($fields, $section, 'Comments', 'textarea', null, ++$i, $group);

        $i = 0;
        $section = 'Administrative';
        $group = $g(21);
        $add($fields, $section, 'Referring Physician', 'text', null, ++$i, $group);
        $add($fields, $section, 'Operator', 'text', null, ++$i, $group);
        $add($fields, $section, 'Fellow', 'text', null, ++$i, $group);
        $add($fields, $section, 'Supervisor Confirm', 'select', ['Yes', 'No'], ++$i, $group);
        $add($fields, $section, 'Medical Device', 'text', null, ++$i, $group);

        // Upsert all
        foreach ($fields as $f) {
            DB::table('template_fields')->updateOrInsert(
                [
                    'template_id' => $f['template_id'],
                    'section' => $f['section'],
                    'label' => $f['label'],
                ],
                $f
            );
        }
    }
}
