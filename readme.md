## Action to generate release notes

Use to create clean release notes from azure devops based on a list of tasks

Usage:

```yaml
on:
  push:
    tags:
      - v**
    

jobs:
  create-release:
    runs-on: ubuntu-latest
    name: Generate release notes
    steps:
      - name: Create notes
        id: getnotes
        uses: equinor/oilmod1-ado-release@main
        env:
          AZURE_PERSONAL_ACCESS_TOKEN: ${{ secrets.AZURE_PERSONAL_ACCESS_TOKEN }} # Get token @ https://dev.azure.com/Equinor/_usersSettings/tokens
        with:
          tasks: '12345,23456,34567,AB-45678' # can be prefixed but not needed
      # Use the output from the `hello` step
      - name: Get the notes
        run: |
          echo "${{ steps.getnotes.outputs.notes }}"
```
