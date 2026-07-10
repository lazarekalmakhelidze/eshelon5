import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const isCloudflarePages = process.env.CF_PAGES === '1' || process.env.CF_PAGES === 'true';

const runNextBuild = () => new Promise((resolve, reject) => {
    const child = spawn('npx next build', {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            ...(isCloudflarePages ? { STATIC_EXPORT: 'true' } : {})
        }
    });

    child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`next build exited with code ${code}`));
    });

    child.on('error', reject);
});

const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

const copyFileEnsured = async (sourcePath, destinationPath) => {
    await ensureDir(path.dirname(destinationPath));
    await fs.copyFile(sourcePath, destinationPath);
};

const copyDirectory = async (sourceDir, destinationDir) => {
    await ensureDir(destinationDir);
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destinationPath = path.join(destinationDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(sourcePath, destinationPath);
        } else {
            await copyFileEnsured(sourcePath, destinationPath);
        }
    }
};

const exportHtmlFromNext = async () => {
    const outDir = path.join(projectRoot, 'out');
    const nextAppDir = path.join(projectRoot, '.next', 'server', 'app');
    const nextStaticDir = path.join(projectRoot, '.next', 'static');
    const publicDir = path.join(projectRoot, 'public');

    await fs.rm(outDir, { recursive: true, force: true });
    await ensureDir(outDir);

    const walk = async (currentDir) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(currentDir, entry.name);
            const relativePath = path.relative(nextAppDir, sourcePath);

            if (entry.isDirectory()) {
                await walk(sourcePath);
                continue;
            }

            if (entry.name.endsWith('.html')) {
                if (entry.name === '_not-found.html') {
                    await copyFileEnsured(sourcePath, path.join(outDir, '404.html'));
                    continue;
                }

                const withoutExt = relativePath.replace(/\.html$/, '');
                const destinationPath = withoutExt === 'index'
                    ? path.join(outDir, 'index.html')
                    : path.join(outDir, withoutExt, 'index.html');

                await copyFileEnsured(sourcePath, destinationPath);
                continue;
            }

        }
    };

    await walk(nextAppDir);

    try {
        await copyDirectory(publicDir, outDir);
    } catch {}

    await copyDirectory(nextStaticDir, path.join(outDir, '_next', 'static'));
};

try {
    await runNextBuild();

    if (isCloudflarePages) {
        await exportHtmlFromNext();
        console.log('\nCreated Cloudflare Pages output in `out`.');
    }
} catch (error) {
    console.error(error);
    process.exit(1);
}
