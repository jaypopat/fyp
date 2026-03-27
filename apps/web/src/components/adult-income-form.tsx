import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";

type AdultIncomeRaw = {
	age: number;
	workclass: string;
	fnlwgt: number;
	education: string;
	educationNum: number;
	maritalStatus: string;
	occupation: string;
	relationship: string;
	race: string;
	sex: string;
	capitalGain: number;
	capitalLoss: number;
	hoursPerWeek: number;
	nativeCountry: string;
};

const WORKCLASS = [
	"?",
	"Federal-gov",
	"Local-gov",
	"Never-worked",
	"Private",
	"Self-emp-inc",
	"Self-emp-not-inc",
	"State-gov",
	"Without-pay",
];

const EDUCATION = [
	"?",
	"10th",
	"11th",
	"12th",
	"1st-4th",
	"5th-6th",
	"7th-8th",
	"9th",
	"Assoc-acdm",
	"Assoc-voc",
	"Bachelors",
	"Doctorate",
	"HS-grad",
	"Masters",
	"Preschool",
	"Prof-school",
	"Some-college",
];

const MARITAL = [
	"?",
	"Divorced",
	"Married-AF-spouse",
	"Married-civ-spouse",
	"Married-spouse-absent",
	"Never-married",
	"Separated",
	"Widowed",
];

const OCCUPATION = [
	"?",
	"Adm-clerical",
	"Armed-Forces",
	"Craft-repair",
	"Exec-managerial",
	"Farming-fishing",
	"Handlers-cleaners",
	"Machine-op-inspct",
	"Other-service",
	"Priv-house-serv",
	"Prof-specialty",
	"Protective-serv",
	"Sales",
	"Tech-support",
	"Transport-moving",
];

const RELATIONSHIP = [
	"Husband",
	"Not-in-family",
	"Other-relative",
	"Own-child",
	"Unmarried",
	"Wife",
];

const RACE = [
	"Amer-Indian-Eskimo",
	"Asian-Pac-Islander",
	"Black",
	"Other",
	"White",
];

const SEX = ["Female", "Male"];

const NATIVE_COUNTRY = [
	"?",
	"Cambodia",
	"Canada",
	"China",
	"Columbia",
	"Cuba",
	"Dominican-Republic",
	"Ecuador",
	"El-Salvador",
	"England",
	"France",
	"Germany",
	"Greece",
	"Guatemala",
	"Haiti",
	"Holand-Netherlands",
	"Honduras",
	"Hong",
	"Hungary",
	"India",
	"Iran",
	"Ireland",
	"Italy",
	"Jamaica",
	"Japan",
	"Laos",
	"Mexico",
	"Nicaragua",
	"Outlying-US(Guam-USVI-etc)",
	"Peru",
	"Philippines",
	"Poland",
	"Portugal",
	"Puerto-Rico",
	"Scotland",
	"South",
	"South Korea",
	"Taiwan",
	"Thailand",
	"Trinadad&Tobago",
	"United-States",
	"Vietnam",
	"Yugoslavia",
];

const DEFAULT_VALUES: AdultIncomeRaw = {
	age: 39,
	workclass: "Private",
	fnlwgt: 77516,
	education: "HS-grad",
	educationNum: 9,
	maritalStatus: "Never-married",
	occupation: "?",
	relationship: "Not-in-family",
	race: "White",
	sex: "Female",
	capitalGain: 0,
	capitalLoss: 0,
	hoursPerWeek: 40,
	nativeCountry: "United-States",
};

type FieldDef =
	| { key: keyof AdultIncomeRaw; label: string; type: "number" }
	| {
			key: keyof AdultIncomeRaw;
			label: string;
			type: "select";
			options: string[];
	  };

const FIELDS: FieldDef[] = [
	{ key: "age", label: "age", type: "number" },
	{ key: "workclass", label: "workclass", type: "select", options: WORKCLASS },
	{ key: "fnlwgt", label: "fnlwgt", type: "number" },
	{ key: "education", label: "education", type: "select", options: EDUCATION },
	{ key: "educationNum", label: "education.num", type: "number" },
	{
		key: "maritalStatus",
		label: "marital.status",
		type: "select",
		options: MARITAL,
	},
	{
		key: "occupation",
		label: "occupation",
		type: "select",
		options: OCCUPATION,
	},
	{
		key: "relationship",
		label: "relationship",
		type: "select",
		options: RELATIONSHIP,
	},
	{ key: "race", label: "race", type: "select", options: RACE },
	{ key: "sex", label: "sex", type: "select", options: SEX },
	{ key: "capitalGain", label: "capital.gain", type: "number" },
	{ key: "capitalLoss", label: "capital.loss", type: "number" },
	{ key: "hoursPerWeek", label: "hours.per.week", type: "number" },
	{
		key: "nativeCountry",
		label: "native.country",
		type: "select",
		options: NATIVE_COUNTRY,
	},
];

function encIdx(list: string[], value: string) {
	const i = list.indexOf(value);
	return i >= 0 ? i : 0;
}

function toVector(r: AdultIncomeRaw): number[] {
	return [
		Number(r.age),
		encIdx(WORKCLASS, r.workclass),
		Number(r.fnlwgt),
		encIdx(EDUCATION, r.education),
		Number(r.educationNum),
		encIdx(MARITAL, r.maritalStatus),
		encIdx(OCCUPATION, r.occupation),
		encIdx(RELATIONSHIP, r.relationship),
		encIdx(RACE, r.race),
		encIdx(SEX, r.sex),
		Number(r.capitalGain),
		Number(r.capitalLoss),
		Number(r.hoursPerWeek),
		encIdx(NATIVE_COUNTRY, r.nativeCountry),
	];
}

function FormField({
	field,
	value,
	formId,
	onChange,
}: {
	field: FieldDef;
	value: string | number;
	formId: string;
	onChange: (key: keyof AdultIncomeRaw, value: string | number) => void;
}) {
	const fieldId = `${formId}-${field.key}`;
	return (
		<div className="space-y-1">
			<label className="text-sm" htmlFor={fieldId}>
				{field.label}
			</label>
			{field.type === "number" ? (
				<input
					id={fieldId}
					type="number"
					className="w-full rounded border px-3 py-2 text-sm"
					value={value}
					onChange={(e) => onChange(field.key, Number(e.target.value))}
				/>
			) : (
				<select
					id={fieldId}
					className="w-full rounded border px-3 py-2 text-sm"
					value={value}
					onChange={(e) => onChange(field.key, e.target.value)}
				>
					{field.options.map((o) => (
						<option key={o} value={o}>
							{o}
						</option>
					))}
				</select>
			)}
		</div>
	);
}

export function AdultIncomeForm(props: {
	value?: AdultIncomeRaw;
	onChange?: (vector: number[], raw: AdultIncomeRaw) => void;
	onSubmit?: (vector: number[], raw: AdultIncomeRaw) => void | Promise<void>;
	loading?: boolean;
	result?: { prediction: number; seqNum: number } | null;
	className?: string;
}) {
	const { value, onChange, onSubmit, loading, result, className } = props;
	const [raw, setRaw] = useState<AdultIncomeRaw>(value ?? DEFAULT_VALUES);
	const formId = useId();

	function update(key: keyof AdultIncomeRaw, val: string | number) {
		const next = { ...raw, [key]: val } as AdultIncomeRaw;
		setRaw(next);
		onChange?.(toVector(next), next);
	}

	// Emit initial vector on mount
	useEffect(() => {
		onChange?.(toVector(raw), raw);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className={className}>
			<div className="grid gap-3 sm:grid-cols-2">
				{FIELDS.map((field) => (
					<FormField
						key={field.key}
						field={field}
						value={raw[field.key]}
						formId={formId}
						onChange={update}
					/>
				))}
			</div>

			{result && (
				<div className="mt-4 rounded bg-muted p-3 text-xs">
					<p>
						<span className="font-medium">Prediction:</span>{" "}
						<b>{result.prediction === 1 ? ">50K" : "≤50K"}</b>
					</p>
					<p>
						<span className="font-medium">Receipt:</span>{" "}
						<code className="text-xs">#{result.seqNum}</code>
					</p>
				</div>
			)}

			{onSubmit && (
				<Button
					disabled={loading}
					className="mt-4 w-full"
					size="default"
					onClick={() => onSubmit(toVector(raw), raw)}
				>
					{loading ? "Predicting…" : "Predict"}
				</Button>
			)}
		</div>
	);
}
