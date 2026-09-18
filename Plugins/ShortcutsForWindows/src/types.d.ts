// PowerShell scripts are imported as text by the "import-powershell-as-text" plugin in rollup.config.mjs.
declare module "*.ps1" {
	const content: string;
	export default content;
}
