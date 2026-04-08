const ANSI = {
	reset: '\u001B[0m',
	bold: '\u001B[1m',
	dim: '\u001B[2m',
	red: '\u001B[31m',
	green: '\u001B[32m',
	yellow: '\u001B[33m',
	cyan: '\u001B[36m',
	magenta: '\u001B[35m',
	blue: '\u001B[34m',
} as const;

function apply(enabled: boolean, ...parts: string[]) {
	return enabled
		? parts.join('')
	: parts.filter((part) => !part.startsWith('\u001B[')).join('');
}

export interface OutputWriter {
	banner(title: string, subtitle?: string): void;
	section(label: string): void;
	item(label: string, value: string): void;
	choice(index: number, label: string, hint?: string, tag?: string): void;
	prompt(label: string, hint?: string): void;
	inlineQuestion(prefix: string): string;
	hero(title: string, subtitle: string): void;
	callout(title: string, lines: string[]): void;
	success(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	plain(message: string): void;
}

export class Output {
	private readonly color: boolean;

	constructor(color = process.stdout.isTTY) {
		this.color = color;
	}

	banner(title: string, subtitle?: string) {
		const top = apply(
			this.color,
			ANSI.dim,
			'┌──────────────────────────────────────────────┐',
			ANSI.reset,
		);
		const middle = apply(
			this.color,
			ANSI.bold,
			ANSI.cyan,
			`│ ${title.padEnd(44)} │`,
			ANSI.reset,
		);
		const bottom = apply(
			this.color,
			ANSI.dim,
			'└──────────────────────────────────────────────┘',
			ANSI.reset,
		);
		process.stdout.write(`${top}\n${middle}\n${bottom}\n`);
		if (subtitle) {
			process.stdout.write(`${this.muted(`  ${subtitle}`)}\n`);
		}
	}

	section(label: string) {
		process.stdout.write(
			`\n${apply(this.color, ANSI.bold, ANSI.magenta, label, ANSI.reset)}\n`,
		);
	}

	item(label: string, value: string) {
		process.stdout.write(
			`  ${apply(this.color, ANSI.blue, '•', ANSI.reset)} ${this.muted(label.padEnd(18))} ${value}\n`,
		);
	}

	choice(index: number, label: string, hint?: string, tag?: string) {
		const tagLabel = tag ? this.muted(`[${tag}]`) : '';
		const suffix = hint ? ` ${this.muted(`(${hint})`)}` : '';
		process.stdout.write(
			`  ${apply(this.color, ANSI.cyan, `${index}.`, ANSI.reset)} ${label} ${tagLabel}${suffix}\n`,
		);
	}

	prompt(label: string, hint?: string) {
		const line = hint ? `${label} ${this.muted(`(${hint})`)}` : label;
		process.stdout.write(
			`\n${apply(this.color, ANSI.bold, ANSI.cyan, '? ', ANSI.reset)}${line}\n`,
		);
	}

	inlineQuestion(prefix: string) {
		return apply(this.color, ANSI.bold, ANSI.yellow, prefix, ANSI.reset);
	}

	hero(title: string, subtitle: string) {
		process.stdout.write(
			`${apply(this.color, ANSI.bold, ANSI.cyan, 'ForgeLoop', ANSI.reset)} ${this.muted('• discord bot forge')}\n`,
		);
		process.stdout.write(`${this.emphasis(title)}\n`);
		process.stdout.write(`${this.muted(subtitle)}\n`);
	}

	callout(title: string, lines: string[]) {
		process.stdout.write(
			`\n${apply(this.color, ANSI.bold, ANSI.yellow, title, ANSI.reset)}\n`,
		);
		for (const line of lines) {
			process.stdout.write(`  ${this.muted('│')} ${line}\n`);
		}
	}

	success(message: string) {
		process.stdout.write(
			`${apply(this.color, ANSI.green, '✓', ANSI.reset)} ${message}\n`,
		);
	}

	info(message: string) {
		process.stdout.write(
			`${apply(this.color, ANSI.cyan, 'i', ANSI.reset)} ${message}\n`,
		);
	}

	warn(message: string) {
		process.stdout.write(
			`${apply(this.color, ANSI.yellow, '!', ANSI.reset)} ${message}\n`,
		);
	}

	error(message: string) {
		process.stderr.write(
			`${apply(this.color, ANSI.red, 'x', ANSI.reset)} ${message}\n`,
		);
	}

	plain(message: string) {
		process.stdout.write(`${message}\n`);
	}

	emphasis(message: string) {
		return apply(this.color, ANSI.bold, message, ANSI.reset);
	}

	muted(message: string) {
		return apply(this.color, ANSI.dim, message, ANSI.reset);
	}
}
