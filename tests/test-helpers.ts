import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export class BufferedOutput {
	logs: string[] = [];
	errors: string[] = [];

	banner(title: string, subtitle?: string) {
		this.logs.push(`${title}${subtitle ? ` ${subtitle}` : ''}`);
	}

	section(label: string) {
		this.logs.push(label);
	}

	item(label: string, value: string) {
		this.logs.push(`${label}:${value}`);
	}

	success(message: string) {
		this.logs.push(message);
	}

	info(message: string) {
		this.logs.push(message);
	}

	warn(message: string) {
		this.logs.push(message);
	}

	error(message: string) {
		this.errors.push(message);
	}

	plain(message: string) {
		this.logs.push(message);
	}

	hero(title: string, subtitle: string) {
		this.logs.push(`${title}:${subtitle}`);
	}

	callout(title: string, lines: string[]) {
		this.logs.push(`${title}:${lines.join(' | ')}`);
	}

	prompt(label: string) {
		this.logs.push(`prompt:${label}`);
	}

	inlineQuestion(prefix: string) {
		return prefix;
	}

	choice(index: number, label: string) {
		this.logs.push(`choice:${index}:${label}`);
	}
}

export async function makeProjectRoot() {
	return mkdtemp(path.join(os.tmpdir(), 'forgeloop-test-'));
}
