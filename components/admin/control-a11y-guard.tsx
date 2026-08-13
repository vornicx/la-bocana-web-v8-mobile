'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function visible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function hasAccessibleName(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (element.getAttribute('aria-label')?.trim() || element.getAttribute('aria-labelledby')?.trim()) return true;
  if (element.labels?.length) return [...element.labels].some((label) => Boolean(label.textContent?.trim()));
  return false;
}

function fallbackName(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const placeholder = element.getAttribute('placeholder')?.trim();
  if (placeholder) return placeholder;
  const name = element.getAttribute('name')?.trim();
  if (name) return name.replace(/[-_]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
  return element.tagName === 'TEXTAREA' ? 'Campo de texto' : 'Campo de formulario';
}

function harden(root: ParentNode = document) {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input:not([type="hidden"]), textarea, select');
  for (const field of fields) {
    if (!visible(field) || hasAccessibleName(field)) continue;
    field.setAttribute('aria-label', fallbackName(field));
    field.dataset.a11yHardened = 'true';
  }
}

export function ControlA11yGuard() {
  const pathname = usePathname();

  useEffect(() => {
    harden();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches('input:not([type="hidden"]),textarea,select')) harden(node.parentElement ?? document);
          else harden(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
