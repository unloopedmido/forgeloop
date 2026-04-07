import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { CliError } from './errors.js';
import { Output } from './format.js';

export interface SelectOption<T extends string> {
	label: string;
	value: T;
	hint?: string;
}

function isInteractiveSession() {
	return Boolean(input.isTTY && output.isTTY);
}

export function canPrompt() {
	return isInteractiveSession();
}

async function withReadline<T>(run: (rl: readline.Interface) => Promise<T>) {
	const rl = readline.createInterface({ input, output });
	try {
		return await run(rl);
	} finally {
		rl.close();
	}
}

export async function promptText(
	outputWriter: Output,
	label: string,
	defaultValue?: string,
	validate?: (value: string) => string | null,
	options?: { allowEmpty?: boolean },
) {
	if (!isInteractiveSession()) {
		throw new CliError(
			`Missing required value for "${label}" in non-interactive mode.`,
		);
	}

	outputWriter.prompt(
		label,
		defaultValue ? `default: ${defaultValue}` : undefined,
	);
	return withReadline(async (rl) => {
		for (;;) {
			const answer = (
				await rl.question(outputWriter.inlineQuestion('> '))
			).trim();
			const value =
				answer.length > 0
					? answer
					: options?.allowEmpty
						? ''
						: defaultValue || '';
			const error = validate ? validate(value) : null;
			if (!error) {
				return value;
			}
			outputWriter.error(error);
		}
	});
}

export async function promptConfirm(
	outputWriter: Output,
	label: string,
	defaultValue: boolean,
) {
	if (!isInteractiveSession()) {
		return defaultValue;
	}

	const defaultToken = defaultValue ? 'Y/n' : 'y/N';
	outputWriter.prompt(label, defaultToken);
	return withReadline(async (rl) => {
		for (;;) {
			const answer = (await rl.question(outputWriter.inlineQuestion('> ')))
				.trim()
				.toLowerCase();
			if (!answer) {
				return defaultValue;
			}
			if (['y', 'yes'].includes(answer)) {
				return true;
			}
			if (['n', 'no'].includes(answer)) {
				return false;
			}
			outputWriter.error('Please answer with yes or no.');
		}
	});
}

export async function promptSelect<T extends string>(
	outputWriter: Output,
	label: string,
	options: SelectOption<T>[],
	defaultValue: T,
) {
	if (!isInteractiveSession()) {
		return defaultValue;
	}

	outputWriter.prompt(label);
	options.forEach((option, index) => {
		const marker = option.value === defaultValue ? 'default' : '       ';
		outputWriter.choice(index + 1, option.label, option.hint, marker);
	});

	return withReadline(async (rl) => {
		for (;;) {
			const answer = (
				await rl.question(outputWriter.inlineQuestion('select> '))
			).trim();
			if (!answer) {
				return defaultValue;
			}

			const numericIndex = Number(answer);
			if (
				Number.isInteger(numericIndex) &&
				numericIndex >= 1 &&
				numericIndex <= options.length
			) {
				return options[numericIndex - 1]!.value;
			}

			const byValue = options.find((option) => option.value === answer);
			if (byValue) {
				return byValue.value;
			}

			outputWriter.error('Select a listed number or exact value.');
		}
	});
}
