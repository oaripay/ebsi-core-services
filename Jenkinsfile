node {
    stage('Clone repo') {
        checkout scm
    }
    stage('Unit test') {
        nodejs(nodeJSInstallationName: '16.13.0') {
            sh 'yarn install --frozen-lockfile'
            sh 'yarn run audit'
            sh 'yarn lint'
            sh 'yarn test:ci'
        }
    }
    ebsi_deploy("clone_repo": false)
}
