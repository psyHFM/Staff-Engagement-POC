export const meta = {
  name: 'angular-review',
  description: 'Reviews frontend code for adherence to the Angular Style Guide',
  phases: [
    { title: 'Analyze', detail: 'Check files against style guide rules' },
    { title: 'Report', detail: 'Synthesize findings into actionable feedback' },
  ],
}

async function run() {
  const styleGuidePath = '.claude/angular-style-guide.md';

  // Determine which files to review based on args (expected as array of paths)
  const filesToReview = args || [];
  if (filesToReview.length === 0) {
    log('No files provided for review. Please provide a list of file paths.');
    return { error: 'No files provided' };
  }

  phase('Analyze');

  const reviews = await parallel(filesToReview.map(file => () =>
    agent(`Review the file \${file} against the rules in \${styleGuidePath}.
    Identify any violations of the Angular Style Guide.
    Be specific about the line number and the rule being violated.
    If the file is compliant, state "Compliant".`, {
      label: `review:${file}`,
      phase: 'Analyze'
    })
  ));

  phase('Report');

  const report = await agent(`Summarize the following Angular Style Guide review results into a concise report.
    Group findings by file.
    If all files were compliant, state that the code adheres to the style guide.

    Results:
    \${reviews.map((r, i) => \`File: \${filesToReview[i]}\\n\${r}\`).join('\\n\\n')}
  `, {
    label: 'synthesize-report',
    phase: 'Report'
  });

  return { report };
}

// The runtime executes the script body; since we aren't using the implicit return
// we call run() and return its result.
return run();
