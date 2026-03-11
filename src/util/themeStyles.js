const parseColor = (value) => {
	if (!value || typeof value !== "string") {
		return null;
	}

	const normalized = value.trim();

	if (normalized.startsWith("#")) {
		let hex = normalized.slice(1);
		if (hex.length === 3) {
			hex = hex
				.split("")
				.map((char) => char + char)
				.join("");
		}

		if (hex.length !== 6) {
			return null;
		}

		return {
			r: parseInt(hex.slice(0, 2), 16),
			g: parseInt(hex.slice(2, 4), 16),
			b: parseInt(hex.slice(4, 6), 16),
		};
	}

	const rgbMatch = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
	if (!rgbMatch) {
		return null;
	}

	return {
		r: Number(rgbMatch[1]),
		g: Number(rgbMatch[2]),
		b: Number(rgbMatch[3]),
	};
};

const withAlpha = (value, alpha) => {
	const rgb = parseColor(value);
	if (!rgb) {
		return value;
	}

	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const mix = (value, ratio, fallback = "#0f172a") => {
	const source = parseColor(value);
	const target = parseColor(fallback);

	if (!source || !target) {
		return value ?? fallback;
	}

	const blend = (channel) => Math.round(source[channel] * ratio + target[channel] * (1 - ratio));

	return `rgb(${blend("r")} ${blend("g")} ${blend("b")})`;
};

export const getCategoryChipStyle = ({ color, colorDark, theme }) => {
	if (theme === "dark") {
		const accent = colorDark || color;
		return {
			backgroundColor: withAlpha(accent, 0.32),
			borderWidth: "1px",
			borderColor: withAlpha(accent, 0.72),
			color: "#f8fafc",
		};
	}

	return {
		backgroundColor: color,
		borderWidth: "1px",
		borderColor: colorDark,
		color: "#475569",
	};
};

export const getBudgetRailStyle = ({ colorLight, colorDark, theme }) => {
	if (theme === "dark") {
		return {
			backgroundColor: "rgba(51, 65, 85, 0.7)",
			borderColor: "rgba(100, 116, 139, 0.45)",
		};
	}

	return {
		backgroundColor: colorLight,
		borderColor: colorDark,
	};
};

export const getBudgetFillColor = ({ colorDark, percentage, theme }) => {
	if (percentage && percentage > 100) {
		return theme === "dark" ? "#f97316" : "#ef4444";
	}

	if (theme === "dark") {
		return mix(colorDark, 0.82, "#0f172a");
	}

	return colorDark;
};
