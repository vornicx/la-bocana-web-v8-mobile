#!/usr/bin/env python3
"""Capture deterministic desktop/mobile QA screenshots with the bundled Chromium."""

import argparse
import asyncio
import base64
import json
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websockets


async def command(socket, counter, method, params=None):
    counter[0] += 1
    identifier = counter[0]
    await socket.send(json.dumps({'id': identifier, 'method': method, 'params': params or {}}))
    while True:
        message = json.loads(await socket.recv())
        if message.get('id') == identifier:
            return message.get('result', {})


async def capture(debug_url, url, output, width, height, full_page, expression, report):
    pages = json.load(urllib.request.urlopen(f'{debug_url}/json/list'))
    page = next(item for item in pages if item['type'] == 'page')
    async with websockets.connect(page['webSocketDebuggerUrl'], max_size=50_000_000) as socket:
        counter = [0]
        await command(socket, counter, 'Page.enable')
        await command(socket, counter, 'Network.enable')
        await command(socket, counter, 'Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': width < 700})
        await command(socket, counter, 'Network.setCookie', {'name': 'lb_privacy_notice', 'value': 'acknowledged', 'url': url})
        await command(socket, counter, 'Page.navigate', {'url': url})
        await asyncio.sleep(2.2)
        if expression:
            await command(socket, counter, 'Runtime.evaluate', {'expression': expression, 'awaitPromise': True})
            await asyncio.sleep(.8)
        if full_page:
            await command(socket, counter, 'Runtime.evaluate', {'expression': "new Promise(async resolve => { for (let y=0; y<document.documentElement.scrollHeight; y+=Math.max(innerHeight*.8,500)) { scrollTo(0,y); await new Promise(r=>setTimeout(r,80)); } scrollTo(0,0); setTimeout(resolve,250); })", 'awaitPromise': True})
        await command(socket, counter, 'Runtime.evaluate', {'expression': "document.querySelectorAll('[data-reveal]').forEach(el => el.dataset.visible='true'); document.fonts.ready"})
        await asyncio.sleep(.4)
        params = {'format': 'png', 'fromSurface': True, 'captureBeyondViewport': full_page}
        if full_page:
            metrics = await command(socket, counter, 'Page.getLayoutMetrics')
            size = metrics['cssContentSize']
            params['clip'] = {'x': 0, 'y': 0, 'width': size['width'], 'height': size['height'], 'scale': 1}
        result = await command(socket, counter, 'Page.captureScreenshot', params)
        Path(output).write_bytes(base64.b64decode(result['data']))
        if report:
            audit = await command(socket, counter, 'Runtime.evaluate', {'expression': "JSON.stringify((()=>{const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};const interactive=[...document.querySelectorAll('a,button,input,summary')].filter(visible);const small=interactive.filter(e=>{const r=e.getBoundingClientRect();return r.width<40||r.height<40});const cells=[...document.querySelectorAll('.calendar-days button')].map(e=>e.getBoundingClientRect());let overlaps=0;for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){const a=cells[i],b=cells[j];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps++}return{url:location.pathname,lang:document.documentElement.lang,title:document.title,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length,smallInteractive:small.length,interactive:interactive.length,calendarOverlaps:overlaps,currentHeroSource:document.querySelector('.experience-hero img,.subpage-image img,.booking-visual img')?.currentSrc||null}})())", 'returnByValue': True})
            print(audit.get('result', {}).get('value', '{}'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('url')
    parser.add_argument('output')
    parser.add_argument('--width', type=int, default=1440)
    parser.add_argument('--height', type=int, default=1000)
    parser.add_argument('--full-page', action='store_true')
    parser.add_argument('--eval', default='')
    parser.add_argument('--report', action='store_true')
    parser.add_argument('--chromium', default='/workspace/scratch/1940ecfbacb6/chromium-catalog-qa/chromium')
    args = parser.parse_args()
    with socket.socket() as candidate:
        candidate.bind(('127.0.0.1', 0))
        port = candidate.getsockname()[1]
    user_data = tempfile.mkdtemp(prefix='labocana-visual-qa-')
    process = subprocess.Popen([args.chromium, '--headless=new', '--no-sandbox', '--disable-gpu', f'--remote-debugging-port={port}', f'--user-data-dir={user_data}', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    debug_url = f'http://127.0.0.1:{port}'
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(f'{debug_url}/json/version')
                break
            except Exception:
                time.sleep(.1)
        asyncio.run(capture(debug_url, args.url, args.output, args.width, args.height, args.full_page, args.eval, args.report))
    finally:
        process.terminate()
        process.wait(timeout=5)
        shutil.rmtree(user_data, ignore_errors=True)


if __name__ == '__main__':
    main()
