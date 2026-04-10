import type { OutputWriter } from '../../src/utils/format.js';

/**
 * Captures structured CLI output for in-process command tests.
 */
export class BufferedOutput implements OutputWriter {
	logs: string[] = [];
	errors: string[] = [];

	banner(title: string, subtitle?: string) {
		this.logs.push(`banner:${title}${subtitle ? `|${subtitle}` : ''}`);
	}

	section(label: string) {
		this.logs.push(`section:${label}`);
	}

	item(label: string, value: string) {
		this.logs.push(`item:${label}:${value}`);
	}

	choice(index: number, label: string, hint?: string, tag?: string) {
		void hint;
		void tag;
		this.logs.push(`choice:${index}:${label}`);
	}

	prompt(label: string, hint?: string) {
		void hint;
		this.logs.push(`prompt:${label}`);
	}

	inlineQuestion(prefix: string) {
		return prefix;
	}

	hero(title: string, subtitle: string) {
		this.logs.push(`hero:${title}:${subtitle}`);
	}

	callout(title: string, lines: string[]) {
		this.logs.push(`callout:${title}:${lines.join('|')}`);
	}

	success(message: string) {
		this.logs.push(`success:${message}`);
	}

	info(message: string) {
		this.logs.push(`info:${message}`);
	}

	warn(message: string) {
		this.logs.push(`warn:${message}`);
	}

	error(message: string) {
		this.errors.push(message);
	}

	plain(message: string) {
		this.logs.push(`plain:${message}`);
	}
}
