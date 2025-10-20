import { useEffect, useId, useMemo, useState } from "react";

export type AdultIncomeRaw = {
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

export function AdultIncomeForm(props: {
	value?: AdultIncomeRaw;
	onChange?: (vector: number[], raw: AdultIncomeRaw) => void;
	className?: string;
}) {
	const { value, onChange, className } = props;
	const [raw, setRaw] = useState<AdultIncomeRaw>(
		value ?? {
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
		},
	);

	// options
	const WORKCLASS = useMemo(
		() =>
			[
				"?",
				"Federal-gov",
				"Local-gov",
				"Never-worked",
				"Private",
				"Self-emp-inc",
				"Self-emp-not-inc",
				"State-gov",
				"Without-pay",
			].sort(),
		[],
	);
	const EDUCATION = useMemo(
		() =>
			[
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
			].sort(),
		[],
	);
	const MARITAL = useMemo(
		() =>
			[
				"?",
				"Divorced",
				"Married-AF-spouse",
				"Married-civ-spouse",
				"Married-spouse-absent",
				"Never-married",
				"Separated",
				"Widowed",
			].sort(),
		[],
	);
	const OCCUPATION = useMemo(
		() =>
			[
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
			].sort(),
		[],
	);
	const RELATIONSHIP = useMemo(
		() =>
			[
				"Husband",
				"Not-in-family",
				"Other-relative",
				"Own-child",
				"Unmarried",
				"Wife",
			].sort(),
		[],
	);
	const RACE = useMemo(
		() =>
			[
				"Amer-Indian-Eskimo",
				"Asian-Pac-Islander",
				"Black",
				"Other",
				"White",
			].sort(),
		[],
	);
	const SEX = useMemo(() => ["Female", "Male"].sort(), []);
	const NATIVE_COUNTRY = useMemo(
		() =>
			[
				"?",
				"United-States",
				"Canada",
				"Mexico",
				"Cuba",
				"Jamaica",
				"India",
				"China",
				"Japan",
				"Philippines",
				"Germany",
				"England",
				"Italy",
				"Poland",
				"Puerto-Rico",
				"South",
				"Dominican-Republic",
				"El-Salvador",
				"Columbia",
				"Guatemala",
				"Vietnam",
				"Taiwan",
				"Iran",
				"Laos",
				"Cambodia",
				"Thailand",
				"Haiti",
				"Honduras",
				"Ecuador",
				"Peru",
				"France",
				"Ireland",
				"Scotland",
				"Yugoslavia",
				"Holand-Netherlands",
				"Greece",
				"Portugal",
				"Hungary",
				"Nicaragua",
				"Outlying-US(Guam-USVI-etc)",
				"Trinadad&Tobago",
				"Hong",
				"South Korea",
			].sort(),
		[],
	);

	const ageId = useId();
	const workclassId = useId();
	const fnlwgtId = useId();
	const educationId = useId();
	const educationNumId = useId();
	const maritalId = useId();
	const occupationId = useId();
	const relationshipId = useId();
	const raceId = useId();
	const sexId = useId();
	const capitalGainId = useId();
	const capitalLossId = useId();
	const hoursId = useId();
	const nativeCountryId = useId();

	function encIdx(list: string[], value: string) {
		const idx = list.indexOf(value);
		return idx >= 0 ? idx : 0;
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

	function update<K extends keyof AdultIncomeRaw>(
		key: K,
		value: AdultIncomeRaw[K],
	) {
		const next = { ...raw, [key]: value } as AdultIncomeRaw;
		setRaw(next);
		onChange?.(toVector(next), next);
	}

	// Emit initial vector on mount so parents have a valid vector before first user edit
	useEffect(() => {
		onChange?.(toVector(raw), raw);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className={className}>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1">
					<label className="text-sm" htmlFor={ageId}>
						age
					</label>
					<input
						id={ageId}
						type="number"
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.age}
						onChange={(e) => update("age", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={workclassId}>
						workclass
					</label>
					<select
						id={workclassId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.workclass}
						onChange={(e) => update("workclass", e.target.value)}
					>
						{WORKCLASS.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={fnlwgtId}>
						fnlwgt
					</label>
					<input
						id={fnlwgtId}
						type="number"
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.fnlwgt}
						onChange={(e) => update("fnlwgt", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={educationId}>
						education
					</label>
					<select
						id={educationId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.education}
						onChange={(e) => update("education", e.target.value)}
					>
						{EDUCATION.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={educationNumId}>
						education.num
					</label>
					<input
						id={educationNumId}
						type="number"
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.educationNum}
						onChange={(e) => update("educationNum", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={maritalId}>
						marital.status
					</label>
					<select
						id={maritalId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.maritalStatus}
						onChange={(e) => update("maritalStatus", e.target.value)}
					>
						{MARITAL.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={occupationId}>
						occupation
					</label>
					<select
						id={occupationId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.occupation}
						onChange={(e) => update("occupation", e.target.value)}
					>
						{OCCUPATION.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={relationshipId}>
						relationship
					</label>
					<select
						id={relationshipId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.relationship}
						onChange={(e) => update("relationship", e.target.value)}
					>
						{RELATIONSHIP.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={raceId}>
						race
					</label>
					<select
						id={raceId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.race}
						onChange={(e) => update("race", e.target.value)}
					>
						{RACE.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={sexId}>
						sex
					</label>
					<select
						id={sexId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.sex}
						onChange={(e) => update("sex", e.target.value)}
					>
						{SEX.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={capitalGainId}>
						capital.gain
					</label>
					<input
						id={capitalGainId}
						type="number"
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.capitalGain}
						onChange={(e) => update("capitalGain", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={capitalLossId}>
						capital.loss
					</label>
					<input
						id={capitalLossId}
						type="number"
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.capitalLoss}
						onChange={(e) => update("capitalLoss", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={hoursId}>
						hours.per.week
					</label>
					<input
						id={hoursId}
						type="number"
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.hoursPerWeek}
						onChange={(e) => update("hoursPerWeek", Number(e.target.value))}
					/>
				</div>
				<div className="space-y-1">
					<label className="text-sm" htmlFor={nativeCountryId}>
						native.country
					</label>
					<select
						id={nativeCountryId}
						className="w-full rounded border px-3 py-2 text-sm"
						value={raw.nativeCountry}
						onChange={(e) => update("nativeCountry", e.target.value)}
					>
						{NATIVE_COUNTRY.map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
}
