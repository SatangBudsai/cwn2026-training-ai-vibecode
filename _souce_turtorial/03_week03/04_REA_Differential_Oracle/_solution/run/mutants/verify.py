import pathlib,json,hashlib,subprocess
M=pathlib.Path(__file__).resolve().parent; R=M.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
hashes=json.loads((M/'test-hashes.json').read_text());source_ok=all(sha(pathlib.Path(p))==v for p,v in hashes.items());copies=[]
for name in ['base']+[f'M{i:02}' for i in range(1,11)]:
 for p,h in hashes.items():
  src=pathlib.Path(p)
  if '/accept/' in p:dest=M/'runs'/name/'accept'/src.name
  else:dest=M/'runs'/name/'diff'/src.relative_to(R/'diff')
  copies.append({'file':str(dest.relative_to(R)),'same':dest.exists() and sha(dest)==h})
mutations=[]
for v in json.loads((M/'manifest.json').read_text()):
 changes=[]
 for p in (M/'base/src').rglob('*'):
  if p.is_file() and sha(p)!=sha(M/v['id']/p.relative_to(M/'base')):changes.append(str(p.relative_to(M/'base')))
 mutations.append({'id':v['id'],'changed_source_files':changes,'exactly_one_expected_file':changes==['src/components/'+v['file']]})
ps=subprocess.check_output(['docker','ps','-a','--format','{{.Names}}'],text=True).splitlines();left=[s for s in ps if s.startswith('mutation-')]
artifacts=[]
for name in ['base']+[f'M{i:02}' for i in range(1,11)]:
 a=json.loads((M/'runs'/name/'accept/results.json').read_text());d=json.loads((M/'runs'/name/'diff/results/diff-results.json').read_text())
 artifacts.append({'id':name,'acceptance_total':len(a['results']),'acceptance_artifact_errors':[x['id'] for x in a['results'] if x.get('artifactError')],'differential_total':len(d['versions']['v3']),'oracle_errors':[k for k,x in d['original'].items() if x.get('error')]})
result={'source_tests_unchanged':source_ok,'copied_test_files':copies,'single_mutations':mutations,'remaining_mutation_containers':left,'runs':artifacts}
(M/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
assert source_ok and all(c['same'] for c in copies) and all(x['exactly_one_expected_file'] for x in mutations) and not left
assert all(x['acceptance_total']==82 and x['differential_total']==8 and not x['acceptance_artifact_errors'] and not x['oracle_errors'] for x in artifacts)
print('Verified: original and copied tests identical; 10 single-source mutations; 11 complete runs; no artifact/oracle errors; no mutation containers remain.')
