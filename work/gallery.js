/**
 * Shared portfolio helpers. Both the homepage preview and work.html
 * load shoots from /work/shoots.json + per-folder manifest.json.
 */
(function (global) {
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function imageSrc(folder, file) {
        return 'work/' + folder + '/' + file;
    }

    function aspectRatio(img) {
        if (img.width && img.height) return img.width / img.height;
        const shape = img.shape || '';
        if (shape === 'square') return 1;
        if (shape === 'landscape') return 3 / 2;
        if (shape.indexOf('4x5') !== -1 || shape.indexOf('4/5') !== -1) return 4 / 5;
        if (shape.indexOf('2x3') !== -1 || shape.indexOf('2/3') !== -1) return 2 / 3;
        if (shape.indexOf('3x4') !== -1 || shape.indexOf('3/4') !== -1) return 3 / 4;
        return 9 / 16;
    }

    function aspectCss(img) {
        if (img.width && img.height) return img.width + ' / ' + img.height;
        const r = aspectRatio(img);
        return r + ' / 1';
    }

    function isLandscape(img) {
        if (img.shape === 'landscape') return true;
        return aspectRatio(img) > 1.15;
    }

    function featuredImages(manifest, cap) {
        const featured = (manifest.images || [])
            .filter(function (img) { return img.featured && img.featured_order != null; })
            .sort(function (a, b) { return a.featured_order - b.featured_order; })
            .map(function (img) {
                return Object.assign({}, img, {
                    folder: manifest.folder,
                    shootTitle: manifest.title,
                    concept: isConcept(img, manifest)
                });
            });
        const limit = cap == null ? featured.length : cap;
        return {
            preview: featured.slice(0, limit),
            extra: featured.slice(limit)
        };
    }

    /**
     * Walk images in order. Consecutive (or same-name) group members
     * become one block sorted by group_order. Ungrouped images stay
     * as individual items.
     */
    function layoutItems(images) {
        const emitted = {};
        const items = [];
        (images || []).forEach(function (img) {
            if (emitted[img.file]) return;
            if (img.group) {
                const groupImages = images
                    .filter(function (candidate) { return candidate.group === img.group; })
                    .sort(function (a, b) { return (a.group_order || 0) - (b.group_order || 0); });
                groupImages.forEach(function (member) { emitted[member.file] = true; });
                items.push({ type: 'group', id: img.group, images: groupImages });
            } else {
                emitted[img.file] = true;
                items.push({ type: 'image', image: img });
            }
        });
        return items;
    }

    /**
     * Sub-section field: fragrance_order (or a generic subsection_order
     * + subsection_field). Falls back to a single untitled section.
     */
    function subsections(manifest) {
        const images = manifest.images || [];
        const order = manifest.fragrance_order || manifest.subsection_order;
        const field = manifest.subsection_field || (manifest.fragrance_order ? 'fragrance' : null);
        if (order && field) {
            return order.map(function (name) {
                return {
                    title: name,
                    images: images.filter(function (img) { return img[field] === name; })
                };
            }).filter(function (section) { return section.images.length > 0; });
        }
        return [{ title: null, images: images }];
    }

    function isConcept(img, shoot) {
        return !!(img && img.concept) || !!(shoot && shoot.concept);
    }

    function conceptBadgeHtml(flag) {
        if (!flag) return '';
        return '<span class="concept-badge">Concept / spec work</span>';
    }

    function looks(manifest) {
        const values = [];
        (manifest.images || []).forEach(function (img) {
            if (img.look && values.indexOf(img.look) === -1) values.push(img.look);
        });
        return values;
    }

    async function loadShoots() {
        const res = await fetch('work/shoots.json');
        if (!res.ok) throw new Error('Failed to load shoots.json');
        const data = await res.json();
        const list = (data.shoots || []).slice().sort(function (a, b) { return a.order - b.order; });
        const shoots = [];
        for (let i = 0; i < list.length; i++) {
            const info = list[i];
            const manifestRes = await fetch('work/' + info.folder + '/manifest.json');
            if (!manifestRes.ok) throw new Error('Failed to load ' + info.folder);
            const manifest = await manifestRes.json();
            const shoot = Object.assign({}, manifest, info, { folder: info.folder });
            shoot.images = (shoot.images || []).map(function (img) {
                return Object.assign({}, img, { concept: isConcept(img, shoot) });
            });
            shoots.push(shoot);
        }
        return shoots;
    }

    function tileHtml(img, folder, extraClass) {
        const src = imageSrc(folder, img.file);
        const alt = escapeHtml(img.alt || '');
        const look = escapeHtml(img.look || img.fragrance || '');
        const noCrop = !!img.no_crop;
        const landscape = isLandscape(img);
        const concept = !!img.concept;
        const classes = ['portfolio-item', 'glass-card', extraClass || '', noCrop ? 'no-crop' : '', landscape ? 'is-landscape' : '']
            .filter(Boolean).join(' ');
        return (
            '<div class="' + classes + '" data-src="' + escapeHtml(src) + '" data-alt="' + alt + '" data-look="' + look + '" data-no-crop="' + (noCrop ? 'true' : 'false') + '" data-concept="' + (concept ? 'true' : 'false') + '">' +
                '<div class="portfolio-frame" style="aspect-ratio: ' + aspectCss(img) + ';">' +
                    '<img src="' + escapeHtml(src) + '" alt="' + alt + '" loading="lazy">' +
                    conceptBadgeHtml(concept) +
                    (look ? '<div class="portfolio-label"><span>' + look + '</span></div>' : '') +
                '</div>' +
            '</div>'
        );
    }

    function groupColsClass(count) {
        if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }

    global.Portfolio = {
        escapeHtml: escapeHtml,
        imageSrc: imageSrc,
        aspectRatio: aspectRatio,
        aspectCss: aspectCss,
        isLandscape: isLandscape,
        featuredImages: featuredImages,
        layoutItems: layoutItems,
        subsections: subsections,
        looks: looks,
        isConcept: isConcept,
        conceptBadgeHtml: conceptBadgeHtml,
        loadShoots: loadShoots,
        tileHtml: tileHtml,
        groupColsClass: groupColsClass
    };
})(window);
